define('errbackoff', [
    './date',
    'logic',
    'module',
    'exports'
], function ($date, logic, $module, exports) {
    var BACKOFF_DURATIONS = exports.BACKOFF_DURATIONS = [
        {
            fixedMS: 0,
            randomMS: 0
        },
        {
            fixedMS: 800,
            randomMS: 400
        },
        {
            fixedMS: 4500,
            randomMS: 1000
        }
    ];
    var BAD_RESOURCE_RETRY_DELAYS_MS = [
        1000,
        60 * 1000,
        2 * 60 * 1000
    ];
    var setTimeoutFunc = window.setTimeout.bind(window);
    exports.TEST_useTimeoutFunc = function (func) {
        setTimeoutFunc = func;
        for (var i = 0; i < BACKOFF_DURATIONS.length; i++) {
            BACKOFF_DURATIONS[i].randomMS = 0;
        }
    };
    function BackoffEndpoint(name, listener) {
        this.state = 'healthy';
        this._iNextBackoff = 0;
        logic.defineScope(this, 'BackoffEndpoint', { name: name });
        logic(this, 'state', { state: this.state });
        this._badResources = {};
        this.listener = listener;
    }
    BackoffEndpoint.prototype = {
        _setState: function (newState) {
            if (this.state === newState)
                return;
            this.state = newState;
            logic(this, 'state', { state: newState });
            if (this.listener)
                this.listener.onEndpointStateChange(newState);
        },
        noteConnectSuccess: function () {
            this._setState('healthy');
            this._iNextBackoff = 0;
        },
        noteConnectFailureMaybeRetry: function (reachable) {
            logic(this, 'connectFailure', { reachable: reachable });
            if (this.state === 'shutdown')
                return false;
            if (reachable) {
                this._setState('broken');
                return false;
            }
            if (this._iNextBackoff > 0)
                this._setState(reachable ? 'broken' : 'unreachable');
            if (this._iNextBackoff >= BACKOFF_DURATIONS.length)
                return false;
            return true;
        },
        noteBrokenConnection: function () {
            logic(this, 'connectFailure', { reachable: true });
            this._setState('broken');
            this._iNextBackoff = BACKOFF_DURATIONS.length;
        },
        scheduleConnectAttempt: function (connectFunc) {
            if (this.state === 'shutdown')
                return;
            if (this._iNextBackoff >= BACKOFF_DURATIONS.length) {
                connectFunc();
                return;
            }
            var backoff = BACKOFF_DURATIONS[this._iNextBackoff++], delay = backoff.fixedMS + Math.floor(Math.random() * backoff.randomMS);
            setTimeoutFunc(connectFunc, delay);
        },
        noteBadResource: function (resourceId) {
            var now = $date.NOW();
            if (!this._badResources.hasOwnProperty(resourceId)) {
                this._badResources[resourceId] = {
                    count: 1,
                    last: now
                };
            } else {
                var info = this._badResources[resourceId];
                info.count++;
                info.last = now;
            }
        },
        resourceIsOkayToUse: function (resourceId) {
            if (!this._badResources.hasOwnProperty(resourceId))
                return true;
            var info = this._badResources[resourceId], now = $date.NOW();
        },
        shutdown: function () {
            this._setState('shutdown');
        }
    };
    exports.createEndpoint = function (name, listener) {
        return new BackoffEndpoint(name, listener);
    };
});
;
define('composite/incoming', [
    'logic',
    '../a64',
    '../accountmixins',
    '../mailslice',
    '../searchfilter',
    '../util',
    '../db/folder_info_rep',
    'require',
    'exports'
], function (logic, $a64, $acctmixins, $mailslice, $searchfilter, $util, $folder_info, require, exports) {
    var bsearchForInsert = $util.bsearchForInsert;
    function cmpFolderPubPath(a, b) {
        return a.path.localeCompare(b.path);
    }
    function CompositeIncomingAccount(FolderSyncer, universe, compositeAccount, accountId, credentials, connInfo, folderInfos, dbConn, existingProtoConn) {
        this.universe = universe;
        this.compositeAccount = compositeAccount;
        this.id = accountId;
        this.accountDef = compositeAccount.accountDef;
        this.enabled = true;
        this._alive = true;
        this._credentials = credentials;
        this._connInfo = connInfo;
        this._db = dbConn;
        var folderStorages = this._folderStorages = {};
        var folderPubs = this.folders = [];
        this.FolderSyncer = FolderSyncer;
        this._deadFolderIds = null;
        this._folderInfos = folderInfos;
        this.meta = this._folderInfos.$meta;
        this.mutations = this._folderInfos.$mutations;
        for (var folderId in folderInfos) {
            if (folderId[0] === '$')
                continue;
            var folderInfo = folderInfos[folderId];
            folderStorages[folderId] = new $mailslice.FolderStorage(this, folderId, folderInfo, this._db, FolderSyncer);
            folderPubs.push(folderInfo.$meta);
        }
        this.folders.sort(function (a, b) {
            return a.path.localeCompare(b.path);
        });
        var inboxFolder = this.getFirstFolderWithType('inbox');
        if (!inboxFolder) {
            this._learnAboutFolder('INBOX', 'INBOX', null, 'inbox', '/', 0, true);
        }
    }
    exports.CompositeIncomingAccount = CompositeIncomingAccount;
    CompositeIncomingAccount.prototype = {
        runOp: $acctmixins.runOp,
        getFirstFolderWithType: $acctmixins.getFirstFolderWithType,
        getFolderByPath: $acctmixins.getFolderByPath,
        saveAccountState: $acctmixins.saveAccountState,
        runAfterSaves: $acctmixins.runAfterSaves,
        _learnAboutFolder: function (name, path, parentId, type, delim, depth, suppressNotification) {
            var folderId = this.id + '/' + $a64.encodeInt(this.meta.nextFolderNum++);
            var folderInfo = this._folderInfos[folderId] = {
                $meta: $folder_info.makeFolderMeta({
                    id: folderId,
                    name: name,
                    type: type,
                    path: path,
                    parentId: parentId,
                    delim: delim,
                    depth: depth,
                    lastSyncedAt: 0,
                    version: $mailslice.FOLDER_DB_VERSION
                }),
                $impl: {
                    nextId: 0,
                    nextHeaderBlock: 0,
                    nextBodyBlock: 0
                },
                accuracy: [],
                headerBlocks: [],
                bodyBlocks: [],
                serverIdHeaderBlockMapping: null
            };
            this._folderStorages[folderId] = new $mailslice.FolderStorage(this, folderId, folderInfo, this._db, this.FolderSyncer);
            var folderMeta = folderInfo.$meta;
            var idx = bsearchForInsert(this.folders, folderMeta, cmpFolderPubPath);
            this.folders.splice(idx, 0, folderMeta);
            if (!suppressNotification)
                this.universe.__notifyAddedFolder(this, folderMeta);
            return folderMeta;
        },
        _forgetFolder: function (folderId, suppressNotification) {
            var folderInfo = this._folderInfos[folderId], folderMeta = folderInfo.$meta;
            delete this._folderInfos[folderId];
            var folderStorage = this._folderStorages[folderId];
            delete this._folderStorages[folderId];
            var idx = this.folders.indexOf(folderMeta);
            this.folders.splice(idx, 1);
            if (this._deadFolderIds === null)
                this._deadFolderIds = [];
            this._deadFolderIds.push(folderId);
            folderStorage.youAreDeadCleanupAfterYourself();
            if (!suppressNotification)
                this.universe.__notifyRemovedFolder(this, folderMeta);
        },
        _recreateFolder: function (folderId, callback) {
            logic(this, 'recreateFolder', { folderId: folderId });
            var folderInfo = this._folderInfos[folderId];
            folderInfo.$impl = {
                nextId: 0,
                nextHeaderBlock: 0,
                nextBodyBlock: 0
            };
            folderInfo.accuracy = [];
            folderInfo.headerBlocks = [];
            folderInfo.bodyBlocks = [];
            if (this._deadFolderIds === null)
                this._deadFolderIds = [];
            this._deadFolderIds.push(folderId);
            var self = this;
            this.saveAccountState(null, function () {
                var newStorage = new $mailslice.FolderStorage(self, folderId, folderInfo, self._db, self.FolderSyncer);
                for (var iter in Iterator(self._folderStorages[folderId]._slices)) {
                    var slice = iter[1];
                    slice._storage = newStorage;
                    slice.reset();
                    newStorage.sliceOpenMostRecent(slice);
                }
                self._folderStorages[folderId]._slices = [];
                self._folderStorages[folderId] = newStorage;
                callback(newStorage);
            }, 'recreateFolder');
        },
        __checkpointSyncCompleted: function (callback, betterReason) {
            this.saveAccountState(null, callback, betterReason || 'checkpointSync');
        },
        deleteFolder: function (folderId, callback) {
            if (!this._folderInfos.hasOwnProperty(folderId))
                throw new Error('No such folder: ' + folderId);
            if (!this.universe.online) {
                if (callback)
                    callback('offline');
                return;
            }
            var folderMeta = this._folderInfos[folderId].$meta;
            var rawConn = null, self = this;
            function gotConn(conn) {
                rawConn = conn;
                rawConn.delBox(folderMeta.path, deletionCallback);
            }
            function deletionCallback(err) {
                if (err)
                    done('unknown');
                else
                    done(null);
            }
            function done(errString) {
                if (rawConn) {
                    self.__folderDoneWithConnection(rawConn, false, false);
                    rawConn = null;
                }
                if (!errString) {
                    logic(self, 'deleteFolder', { path: folderMeta.path });
                    self._forgetFolder(folderId);
                }
                if (callback)
                    callback(errString, folderMeta);
            }
            this.__folderDemandsConnection(null, 'deleteFolder', gotConn);
        },
        getFolderStorageForFolderId: function (folderId) {
            if (this._folderStorages.hasOwnProperty(folderId))
                return this._folderStorages[folderId];
            throw new Error('No folder with id: ' + folderId);
        },
        getFolderStorageForMessageSuid: function (messageSuid) {
            var folderId = messageSuid.substring(0, messageSuid.lastIndexOf('/'));
            if (this._folderStorages.hasOwnProperty(folderId))
                return this._folderStorages[folderId];
            throw new Error('No folder with id: ' + folderId);
        },
        getFolderMetaForFolderId: function (folderId) {
            if (this._folderInfos.hasOwnProperty(folderId))
                return this._folderInfos[folderId].$meta;
            return null;
        },
        sliceFolderMessages: function (folderId, bridgeHandle) {
            var storage = this._folderStorages[folderId], slice = new $mailslice.MailSlice(bridgeHandle, storage);
            storage.sliceOpenMostRecent(slice);
        },
        searchFolderMessages: function (folderId, bridgeHandle, phrase, whatToSearch) {
            var storage = this._folderStorages[folderId], slice = new $searchfilter.SearchSlice(bridgeHandle, storage, phrase, whatToSearch);
            storage.sliceOpenSearch(slice);
            return slice;
        },
        shutdownFolders: function () {
            for (var iFolder = 0; iFolder < this.folders.length; iFolder++) {
                var folderPub = this.folders[iFolder], folderStorage = this._folderStorages[folderPub.id];
                folderStorage.shutdown();
            }
        },
        scheduleMessagePurge: function (folderId, callback) {
            this.universe.purgeExcessMessages(this.compositeAccount, folderId, callback);
        },
        onEndpointStateChange: function (state) {
            switch (state) {
            case 'healthy':
                this.universe.__removeAccountProblem(this.compositeAccount, 'connection', 'incoming');
                break;
            case 'unreachable':
            case 'broken':
                this.universe.__reportAccountProblem(this.compositeAccount, 'connection', 'incoming');
                break;
            }
        }
    };
});
;
define('imap/folder', [
    'logic',
    '../a64',
    '../allback',
    '../date',
    '../syncbase',
    '../util',
    'module',
    'require',
    'exports'
], function (logic, $a64, $allback, $date, $sync, $util, $module, require, exports) {
    var $imaptextparser = null;
    var $imapsnippetparser = null;
    var $imapbodyfetcher = null;
    var $imapchew = null;
    var $imapsync = null;
    var allbackMaker = $allback.allbackMaker, bsearchForInsert = $util.bsearchForInsert, bsearchMaybeExists = $util.bsearchMaybeExists, cmpHeaderYoungToOld = $util.cmpHeaderYoungToOld, DAY_MILLIS = $date.DAY_MILLIS, NOW = $date.NOW, BEFORE = $date.BEFORE, ON_OR_BEFORE = $date.ON_OR_BEFORE, SINCE = $date.SINCE, TIME_DIR_AT_OR_BEYOND = $date.TIME_DIR_AT_OR_BEYOND, TIME_DIR_ADD = $date.TIME_DIR_ADD, TIME_DIR_DELTA = $date.TIME_DIR_DELTA, makeDaysAgo = $date.makeDaysAgo, makeDaysBefore = $date.makeDaysBefore, quantizeDate = $date.quantizeDate, PASTWARDS = 1, FUTUREWARDS = -1;
    function compactArray(arr) {
        var delta = 0, len = arr.length;
        for (var i = 0; i < len; i++) {
            var obj = arr[i];
            if (obj === null) {
                delta++;
                continue;
            }
            if (delta)
                arr[i - delta] = obj;
        }
        if (delta)
            arr.splice(len - delta, delta);
        return arr;
    }
    var NUMBER_OF_SNIPPET_BYTES = 256;
    var MAX_FETCH_BYTES = Math.pow(2, 32) - 1;
    function ImapFolderConn(account, storage) {
        this._account = account;
        this._storage = storage;
        logic.defineScope(this, 'ImapFolderConn', {
            accountId: account.id,
            folderId: storage.folderId
        });
        this._conn = null;
        this.box = null;
        this._deathback = null;
    }
    ImapFolderConn.prototype = {
        acquireConn: function (callback, deathback, label, dieOnConnectFailure) {
            var self = this;
            this._deathback = deathback;
            this._account.__folderDemandsConnection(this._storage.folderId, label, function gotconn(conn) {
                self._conn = conn;
                self._conn.selectMailbox(self._storage.folderMeta.path, function openedBox(err, box) {
                    if (err) {
                        console.error('Problem entering folder', self._storage.folderMeta.path);
                        self._conn = null;
                        self._account.__folderDoneWithConnection(self._conn, false, true);
                        if (self._deathback) {
                            var deathback = self._deathback;
                            self.clearErrorHandler();
                            deathback();
                        }
                        return;
                    }
                    self.box = box;
                    callback(self, self._storage);
                });
            }, function deadconn() {
                self._conn = null;
                if (self._deathback) {
                    var deathback = self._deathback;
                    self.clearErrorHandler();
                    deathback();
                }
            }, dieOnConnectFailure);
        },
        relinquishConn: function () {
            if (!this._conn)
                return;
            this.clearErrorHandler();
            this._account.__folderDoneWithConnection(this._conn, true, false);
            this._conn = null;
        },
        withConnection: function (callback, deathback, label, dieOnConnectFailure) {
            if (!this._conn) {
                this.acquireConn(function () {
                    this.withConnection(callback, deathback, label);
                }.bind(this), deathback, label, dieOnConnectFailure);
                return;
            }
            this._deathback = deathback;
            callback(this);
        },
        clearErrorHandler: function () {
            this._deathback = null;
        },
        reselectBox: function (callback) {
            this._conn.selectMailbox(this._storage.folderMeta.path, callback);
        },
        _timelySyncSearch: function (searchOptions, searchedCallback, abortedCallback, progressCallback, isRetry) {
            var gotSearchResponse = false;
            if (!this._conn) {
                this.acquireConn(this._timelySyncSearch.bind(this, searchOptions, searchedCallback, abortedCallback, progressCallback, isRetry), abortedCallback, 'sync', true);
                return;
            } else {
                if (!isRetry) {
                    var origAbortedCallback = abortedCallback;
                    abortedCallback = function () {
                        if (!gotSearchResponse) {
                            console.warn('Broken connection for SEARCH. Retrying.');
                            this._timelySyncSearch(searchOptions, searchedCallback, origAbortedCallback, progressCallback, true);
                        } else {
                            origAbortedCallback();
                        }
                    }.bind(this);
                }
                this._deathback = abortedCallback;
            }
            if (progressCallback)
                progressCallback(0.1);
            if (this._account.isGmail) {
                this._conn.exec('NOOP');
            }
            this._conn.search(searchOptions, { byUid: true }, function (err, uids) {
                gotSearchResponse = true;
                if (err) {
                    console.error('Search error on', searchOptions, 'err:', err);
                    abortedCallback();
                    return;
                }
                searchedCallback(uids);
            });
        },
        syncDateRange: function () {
            var args = Array.slice(arguments);
            var self = this;
            require(['imap/protocol/sync'], function (_sync) {
                $imapsync = _sync;
                (self.syncDateRange = self._lazySyncDateRange).apply(self, args);
            });
        },
        _lazySyncDateRange: function (startTS, endTS, accuracyStamp, doneCallback, progressCallback) {
            var scope = logic.subscope(this, {
                startTS: startTS,
                endTS: endTS
            });
            if (startTS && endTS && SINCE(startTS, endTS)) {
                logic(scope, 'illegalSync');
                doneCallback('invariant');
                return;
            }
            var self = this;
            var storage = self._storage;
            var completed = false;
            console.log('syncDateRange:', startTS, endTS);
            logic(scope, 'syncDateRange_begin');
            var searchOptions = { not: { deleted: true } };
            if (startTS) {
                searchOptions.since = new Date(startTS);
            }
            if (endTS) {
                searchOptions.before = new Date(endTS);
            }
            var imapSearchPromise = new Promise(function (resolve) {
                this._timelySyncSearch(searchOptions, resolve, function abortedSearch() {
                    if (completed)
                        return;
                    completed = true;
                    logic(scope, 'syncDateRange_end', {
                        full: 0,
                        flags: 0,
                        deleted: 0
                    });
                    doneCallback('aborted');
                }.bind(this), progressCallback, false);
            }.bind(this));
            var dbStartTS = startTS ? startTS - $sync.IMAP_SEARCH_AMBIGUITY_MS : null;
            var dbEndTS = endTS ? endTS + $sync.IMAP_SEARCH_AMBIGUITY_MS : null;
            logic(scope, 'database-lookup', {
                dbStartTS: dbStartTS,
                dbEndTS: dbEndTS
            });
            var databaseFetchPromise = new Promise(function (resolve) {
                storage.getAllMessagesInImapDateRange(dbStartTS, dbEndTS, resolve);
            });
            Promise.all([
                imapSearchPromise,
                databaseFetchPromise
            ]).then(function (results) {
                var serverUIDs = results[0];
                var dbHeaders = results[1];
                var effectiveEndTS = endTS || quantizeDate(NOW() + DAY_MILLIS);
                var curDaysDelta = Math.round((effectiveEndTS - startTS) / DAY_MILLIS);
                var shouldBisect = serverUIDs.length > $sync.BISECT_DATE_AT_N_MESSAGES && curDaysDelta > 1;
                console.log('[syncDateRange]', 'Should bisect?', shouldBisect ? '***YES, BISECT!***' : 'no.', 'curDaysDelta =', curDaysDelta, 'serverUIDs.length =', serverUIDs.length);
                if (shouldBisect) {
                    logic(scope, 'syncDateRange_end');
                    var bisectInfo = {
                        oldStartTS: startTS,
                        oldEndTS: endTS,
                        numHeaders: serverUIDs.length,
                        curDaysDelta: curDaysDelta,
                        newStartTS: startTS,
                        newEndTS: endTS
                    };
                    if (doneCallback('bisect', bisectInfo, null) === 'abort') {
                        self.clearErrorHandler();
                        doneCallback('bisect-aborted', null);
                    } else {
                        self.syncDateRange(bisectInfo.newStartTS, bisectInfo.newEndTS, accuracyStamp, doneCallback, progressCallback);
                    }
                    return;
                }
                if (progressCallback) {
                    progressCallback(0.25);
                }
                var uidSet = new Set();
                var serverUidSet = new Set();
                var localHeaderMap = {};
                dbHeaders.forEach(function (header) {
                    if (header.srvid !== null) {
                        uidSet.add(header.srvid);
                        localHeaderMap[header.srvid] = header;
                    }
                });
                serverUIDs.forEach(function (uid) {
                    uidSet.add(uid);
                    serverUidSet.add(uid);
                });
                var imapSyncOptions = {
                    connection: self._conn,
                    storage: storage,
                    newUIDs: [],
                    knownUIDs: [],
                    knownHeaders: []
                };
                var numDeleted = 0;
                var latch = $allback.latch();
                uidSet.forEach(function (uid) {
                    var localHeader = localHeaderMap[uid] || null;
                    var hasServer = serverUidSet.has(uid);
                    if (!localHeader && hasServer) {
                        imapSyncOptions.newUIDs.push(uid);
                        logic(scope, 'new-uid', { uid: uid });
                    } else if (localHeader && hasServer) {
                        imapSyncOptions.knownUIDs.push(uid);
                        imapSyncOptions.knownHeaders.push(localHeader);
                        if (localHeader.imapMissingInSyncRange) {
                            localHeader.imapMissingInSyncRange = null;
                            logic(scope, 'found-missing-uid', { uid: uid });
                            storage.updateMessageHeader(localHeader.date, localHeader.id, true, localHeader, null, latch.defer(), { silent: true });
                        }
                        logic(scope, 'updated-uid', { uid: uid });
                    } else if (localHeader && !hasServer) {
                        var fuzz = $sync.IMAP_SEARCH_AMBIGUITY_MS;
                        var date = localHeader.date;
                        var missingRange;
                        if (!localHeader.imapMissingInSyncRange || (localHeader.imapMissingInSyncRange.endTS < startTS || localHeader.imapMissingInSyncRange.startTS > endTS)) {
                            missingRange = localHeader.imapMissingInSyncRange = {
                                startTS: startTS || 0,
                                endTS: endTS || Infinity
                            };
                        } else {
                            missingRange = localHeader.imapMissingInSyncRange;
                            missingRange.startTS = Math.min(startTS || 0, missingRange.startTS || 0);
                            missingRange.endTS = Math.max(endTS || Infinity, missingRange.endTS || Infinity);
                        }
                        if (missingRange.startTS <= date - fuzz && missingRange.endTS >= date + fuzz) {
                            logic(scope, 'unambiguously-deleted-uid', {
                                uid: uid,
                                date: date,
                                fuzz: fuzz,
                                missingRange: missingRange
                            });
                            storage.deleteMessageHeaderAndBodyUsingHeader(localHeader);
                            numDeleted++;
                        } else {
                            logic(scope, 'ambiguously-missing-uid', {
                                uid: uid,
                                missingRange: missingRange,
                                rangeToDelete: {
                                    startTS: date - fuzz,
                                    endTS: date + fuzz
                                },
                                syncRange: {
                                    startTS: startTS,
                                    endTS: endTS
                                }
                            });
                            storage.updateMessageHeader(localHeader.date, localHeader.id, true, localHeader, null, latch.defer(), { silent: true });
                        }
                    }
                });
                latch.then(function () {
                    var uidSync = new $imapsync.Sync(imapSyncOptions);
                    uidSync.onprogress = progressCallback;
                    uidSync.oncomplete = function (newCount, knownCount) {
                        logic(scope, 'syncDateRange_end', {
                            full: newCount,
                            flags: knownCount,
                            deleted: numDeleted
                        });
                        var modseq = (self.box.highestModseq || '') + '';
                        storage.markSyncRange(startTS, endTS, modseq, accuracyStamp);
                        if (!completed) {
                            completed = true;
                            self.clearErrorHandler();
                            doneCallback(null, null, newCount + knownCount, startTS, endTS);
                        }
                    };
                });
            }.bind(this));
        },
        downloadBodyReps: function () {
            var args = Array.slice(arguments);
            var self = this;
            require([
                './imapchew',
                './protocol/bodyfetcher',
                './protocol/textparser',
                './protocol/snippetparser'
            ], function (_imapchew, _bodyfetcher, _textparser, _snippetparser) {
                $imapchew = _imapchew;
                $imapbodyfetcher = _bodyfetcher;
                $imaptextparser = _textparser;
                $imapsnippetparser = _snippetparser;
                (self.downloadBodyReps = self._lazyDownloadBodyReps).apply(self, args);
            });
        },
        _lazyDownloadBodyReps: function (header, options, callback) {
            if (typeof options === 'function') {
                callback = options;
                options = null;
            }
            options = options || {};
            var self = this;
            var gotBody = function gotBody(bodyInfo) {
                var bodyRepIdx = $imapchew.selectSnippetBodyRep(header, bodyInfo);
                var overallMaximumBytes = options.maximumBytesToFetch;
                var bodyParser = $imaptextparser.TextParser;
                var requests = [];
                var latch = $allback.latch();
                bodyInfo.bodyReps.forEach(function (rep, idx) {
                    if (rep.isDownloaded)
                        return;
                    var bytesToFetch = Math.min(rep.sizeEstimate * 5, MAX_FETCH_BYTES);
                    if (overallMaximumBytes !== undefined) {
                        bodyParser = $imapsnippetparser.SnippetParser;
                        if (overallMaximumBytes <= 0) {
                            return;
                        }
                        if (rep.sizeEstimate > overallMaximumBytes) {
                            bytesToFetch = overallMaximumBytes;
                        }
                        overallMaximumBytes -= rep.sizeEstimate;
                    }
                    if (bytesToFetch <= 0)
                        bytesToFetch = 64;
                    var request = {
                        uid: header.srvid,
                        partInfo: rep._partInfo,
                        bodyRepIndex: idx,
                        createSnippet: idx === bodyRepIdx,
                        headerUpdatedCallback: latch.defer(header.srvid + '-' + rep._partInfo)
                    };
                    if (overallMaximumBytes !== undefined || rep.amountDownloaded) {
                        request.bytes = [
                            rep.amountDownloaded,
                            bytesToFetch
                        ];
                    }
                    requests.push(request);
                });
                if (!requests.length) {
                    callback(null, bodyInfo);
                    return;
                }
                var fetch = new $imapbodyfetcher.BodyFetcher(self._conn, bodyParser, requests);
                self._handleBodyFetcher(fetch, header, bodyInfo, latch.defer('body'));
                latch.then(function (results) {
                    callback($allback.extractErrFromCallbackArgs(results), bodyInfo);
                });
            };
            this._storage.getMessageBody(header.suid, header.date, gotBody);
        },
        _handleBodyFetcher: function (fetcher, header, body, bodyUpdatedCallback) {
            var event = { changeDetails: { bodyReps: [] } };
            fetcher.onparsed = function (err, req, resp) {
                if (err) {
                    req.headerUpdatedCallback(err);
                    return;
                }
                $imapchew.updateMessageWithFetch(header, body, req, resp);
                header.bytesToDownloadForBodyDisplay = $imapchew.calculateBytesToDownloadForImapBodyDisplay(body);
                this._storage.updateMessageHeader(header.date, header.id, false, header, body, req.headerUpdatedCallback.bind(null, null));
                event.changeDetails.bodyReps.push(req.bodyRepIndex);
            }.bind(this);
            fetcher.onend = function () {
                this._storage.updateMessageBody(header, body, {}, event, bodyUpdatedCallback.bind(null, null));
            }.bind(this);
        },
        _lazyDownloadBodies: function (headers, options, callback) {
            var downloadsNeeded = 0;
            var latch = $allback.latch();
            for (var i = 0; i < headers.length; i++) {
                var header = headers[i];
                if (!header || header.snippet !== null) {
                    continue;
                }
                downloadsNeeded++;
                this.downloadBodyReps(headers[i], options, latch.defer(header.suid));
            }
            latch.then(function (results) {
                callback($allback.extractErrFromCallbackArgs(results), downloadsNeeded);
            });
        },
        downloadBodies: function () {
            var args = Array.slice(arguments);
            var self = this;
            require([
                './imapchew',
                './protocol/bodyfetcher',
                './protocol/snippetparser'
            ], function (_imapchew, _bodyfetcher, _snippetparser) {
                $imapchew = _imapchew;
                $imapbodyfetcher = _bodyfetcher;
                $imapsnippetparser = _snippetparser;
                (self.downloadBodies = self._lazyDownloadBodies).apply(self, args);
            });
        },
        downloadMessageAttachments: function (uid, partInfos, callback, progress) {
            require(['mimeparser'], function (MimeParser) {
                var conn = this._conn;
                var self = this;
                var latch = $allback.latch();
                var anyError = null;
                var bodies = [];
                partInfos.forEach(function (partInfo, index) {
                    var partKey = 'body.peek[' + partInfo.part + ']';
                    var partDone = latch.defer(partInfo.part);
                    conn.listMessages(uid, [partKey], { byUid: true }, function (err, messages) {
                        if (err) {
                            anyError = err;
                            console.error('attachments:download-error', {
                                error: err,
                                part: partInfo.part,
                                type: partInfo.type
                            });
                            partDone();
                            return;
                        }
                        var msg = messages[0];
                        var bodyPart;
                        for (var key in msg) {
                            if (/body\[/.test(key)) {
                                bodyPart = msg[key];
                                break;
                            }
                        }
                        if (!bodyPart) {
                            console.error('attachments:download-error', {
                                error: 'no body part?',
                                requestedPart: partKey,
                                responseKeys: Object.keys(msg)
                            });
                            partDone();
                            return;
                        }
                        var parser = new MimeParser();
                        parser.write('Content-Type: ' + partInfo.type + '\r\n');
                        parser.write('Content-Transfer-Encoding: ' + partInfo.encoding + '\r\n');
                        parser.write('\r\n');
                        parser.write(bodyPart);
                        parser.end();
                        var node = parser.node;
                        bodies[index] = new Blob([node.content], { type: node.contentType.value });
                        partDone();
                    });
                });
                latch.then(function (results) {
                    callback(anyError, bodies);
                });
            }.bind(this));
        },
        shutdown: function () {
        }
    };
    function ImapFolderSyncer(account, folderStorage) {
        this._account = account;
        this.folderStorage = folderStorage;
        logic.defineScope(this, 'ImapFolderSyncer', {
            accountId: account.id,
            folderId: folderStorage.folderId
        });
        this._syncSlice = null;
        this._curSyncAccuracyStamp = null;
        this._curSyncDir = 1;
        this._curSyncIsGrow = null;
        this._nextSyncAnchorTS = null;
        this._fallbackOriginTS = null;
        this._syncThroughTS = null;
        this._curSyncDayStep = null;
        this._curSyncDoNotGrowBoundary = null;
        this._curSyncDoneCallback = null;
        this.folderConn = new ImapFolderConn(account, folderStorage);
    }
    exports.ImapFolderSyncer = ImapFolderSyncer;
    ImapFolderSyncer.prototype = {
        syncable: true,
        get canGrowSync() {
            return !this.folderStorage.isLocalOnly;
        },
        initialSync: function (slice, initialDays, syncCallback, doneCallback, progressCallback) {
            syncCallback('sync', false);
            this.folderConn.withConnection(function (folderConn, storage) {
                var syncWholeTimeRange = false;
                if (folderConn && folderConn.box && folderConn.box.exists < $sync.SYNC_WHOLE_FOLDER_AT_N_MESSAGES) {
                    syncWholeTimeRange = true;
                }
                this._startSync(slice, PASTWARDS, 'grow', null, $sync.OLDEST_SYNC_DATE, null, syncWholeTimeRange ? null : initialDays, doneCallback, progressCallback);
            }.bind(this), function died() {
                doneCallback('aborted');
            }, 'initialSync', true);
        },
        refreshSync: function (slice, dir, startTS, endTS, origStartTS, doneCallback, progressCallback) {
            this._startSync(slice, dir, 'refresh', dir === PASTWARDS ? endTS : startTS, dir === PASTWARDS ? startTS : endTS, origStartTS, null, doneCallback, progressCallback);
        },
        growSync: function (slice, growthDirection, anchorTS, syncStepDays, doneCallback, progressCallback) {
            var syncThroughTS;
            if (growthDirection === PASTWARDS) {
                syncThroughTS = $sync.OLDEST_SYNC_DATE;
            } else {
                syncThroughTS = null;
            }
            this._startSync(slice, growthDirection, 'grow', anchorTS, syncThroughTS, null, syncStepDays, doneCallback, progressCallback);
        },
        _startSync: function ifs__startSync(slice, dir, syncTypeStr, originTS, syncThroughTS, fallbackOriginTS, syncStepDays, doneCallback, progressCallback) {
            var startTS, endTS;
            this._syncSlice = slice;
            this._curSyncAccuracyStamp = NOW();
            this._curSyncDir = dir;
            this._curSyncIsGrow = syncTypeStr === 'grow';
            this._fallbackOriginTS = fallbackOriginTS;
            if (dir === PASTWARDS) {
                endTS = originTS;
                if (syncStepDays) {
                    if (endTS)
                        this._nextSyncAnchorTS = startTS = endTS - syncStepDays * DAY_MILLIS;
                    else
                        this._nextSyncAnchorTS = startTS = makeDaysAgo(syncStepDays);
                } else {
                    startTS = syncThroughTS;
                    this._nextSyncAnchorTS = null;
                }
            } else {
                startTS = originTS;
                if (syncStepDays) {
                    this._nextSyncAnchorTS = endTS = startTS + syncStepDays * DAY_MILLIS;
                } else {
                    endTS = syncThroughTS;
                    this._nextSyncAnchorTS = null;
                }
            }
            this._syncThroughTS = syncThroughTS;
            this._curSyncDayStep = syncStepDays;
            this._curSyncDoNotGrowBoundary = null;
            this._curSyncDoneCallback = doneCallback;
            this.folderConn.syncDateRange(startTS, endTS, this._curSyncAccuracyStamp, this.onSyncCompleted.bind(this), progressCallback);
        },
        _doneSync: function ifs__doneSync(err) {
            this._syncSlice.desiredHeaders = this._syncSlice.headers.length;
            this._account.__checkpointSyncCompleted(function () {
                if (this._curSyncDoneCallback)
                    this._curSyncDoneCallback(err);
                this._syncSlice = null;
                this._curSyncAccuracyStamp = null;
                this._curSyncDir = null;
                this._nextSyncAnchorTS = null;
                this._syncThroughTS = null;
                this._curSyncDayStep = null;
                this._curSyncDoNotGrowBoundary = null;
                this._curSyncDoneCallback = null;
            }.bind(this));
        },
        onSyncCompleted: function ifs_onSyncCompleted(err, bisectInfo, messagesSeen, effStartTS, effEndTS) {
            if (err === 'bisect') {
                var curDaysDelta = bisectInfo.curDaysDelta, numHeaders = bisectInfo.numHeaders;
                if (this._curSyncDir === FUTUREWARDS && this._fallbackOriginTS) {
                    this.folderStorage.clearSyncedToDawnOfTime(this._fallbackOriginTS);
                    bisectInfo.oldStartTS = this._fallbackOriginTS;
                    this._fallbackOriginTS = null;
                    var effOldEndTS = bisectInfo.oldEndTS || quantizeDate(NOW() + DAY_MILLIS);
                    curDaysDelta = Math.round((effOldEndTS - bisectInfo.oldStartTS) / DAY_MILLIS);
                    numHeaders = $sync.BISECT_DATE_AT_N_MESSAGES * 1.5;
                } else if (curDaysDelta > 1000)
                    curDaysDelta = 30;
                var shrinkScale = $sync.BISECT_DATE_AT_N_MESSAGES / (numHeaders * 2), dayStep = Math.max(1, Math.min(curDaysDelta - 2, Math.ceil(shrinkScale * curDaysDelta)));
                this._curSyncDayStep = dayStep;
                if (this._curSyncDir === PASTWARDS) {
                    bisectInfo.newEndTS = bisectInfo.oldEndTS;
                    this._nextSyncAnchorTS = bisectInfo.newStartTS = makeDaysBefore(bisectInfo.newEndTS, dayStep);
                    this._curSyncDoNotGrowBoundary = bisectInfo.oldStartTS;
                } else {
                    bisectInfo.newStartTS = bisectInfo.oldStartTS;
                    this._nextSyncAnchorTS = bisectInfo.newEndTS = makeDaysBefore(bisectInfo.newStartTS, -dayStep);
                    this._curSyncDoNotGrowBoundary = bisectInfo.oldEndTS;
                }
                return;
            } else if (err) {
                this._doneSync(err);
                return;
            }
            console.log('Sync Completed!', this._curSyncDayStep, 'days', messagesSeen, 'messages synced');
            if (this._syncSlice.isDead) {
                this._doneSync();
                return;
            }
            var folderMessageCount = this.folderConn && this.folderConn.box && this.folderConn.box.exists, dbCount = this.folderStorage.getKnownMessageCount(), syncedThrough = this._curSyncDir === PASTWARDS ? effStartTS : effEndTS;
            console.log('folder message count', folderMessageCount, 'dbCount', dbCount, 'syncedThrough', syncedThrough, 'oldest known', this.folderStorage.getOldestMessageTimestamp());
            if (this._curSyncDir === PASTWARDS && folderMessageCount === dbCount && (!folderMessageCount || TIME_DIR_AT_OR_BEYOND(this._curSyncDir, syncedThrough, this.folderStorage.getOldestMessageTimestamp()))) {
                this.folderStorage.markSyncedToDawnOfTime();
                this._doneSync();
                return;
            }
            if (!this._nextSyncAnchorTS || TIME_DIR_AT_OR_BEYOND(this._curSyncDir, this._nextSyncAnchorTS, this._syncThroughTS)) {
                this._doneSync();
                return;
            }
            if (this._curSyncIsGrow && this._syncSlice.headers.length >= this._syncSlice.desiredHeaders) {
                console.log('SYNCDONE Enough headers retrieved.', 'have', this._syncSlice.headers.length, 'want', this._syncSlice.desiredHeaders, 'conn knows about', this.folderConn.box.exists, 'sync date', this._curSyncStartTS, '[oldest defined as', $sync.OLDEST_SYNC_DATE, ']');
                this._doneSync();
                return;
            }
            var daysToSearch, lastSyncDaysInPast;
            if (messagesSeen || this._curSyncDoNotGrowBoundary !== null && !TIME_DIR_AT_OR_BEYOND(this._curSyncDir, this._nextSyncAnchorTS, this._curSyncDoNotGrowBoundary)) {
                daysToSearch = this._curSyncDayStep;
            } else {
                this._curSyncDoNotGrowBoundary = null;
                lastSyncDaysInPast = (quantizeDate(NOW()) - this._nextSyncAnchorTS) / DAY_MILLIS;
                daysToSearch = Math.ceil(this._curSyncDayStep * $sync.TIME_SCALE_FACTOR_ON_NO_MESSAGES);
                if (lastSyncDaysInPast < 180) {
                    if (daysToSearch > 45)
                        daysToSearch = 45;
                } else if (lastSyncDaysInPast < 365) {
                    if (daysToSearch > 90)
                        daysToSearch = 90;
                } else if (lastSyncDaysInPast < 730) {
                    if (daysToSearch > 120)
                        daysToSearch = 120;
                } else if (lastSyncDaysInPast < 1825) {
                    if (daysToSearch > 180)
                        daysToSearch = 180;
                } else if (lastSyncDaysInPast < 3650) {
                    if (daysToSearch > 365)
                        daysToSearch = 365;
                } else if (daysToSearch > 730) {
                    daysToSearch = 730;
                }
                this._curSyncDayStep = daysToSearch;
            }
            var startTS, endTS;
            if (this._curSyncDir === PASTWARDS) {
                endTS = this._nextSyncAnchorTS;
                this._nextSyncAnchorTS = startTS = makeDaysBefore(endTS, daysToSearch);
            } else {
                startTS = this._nextSyncAnchorTS;
                this._nextSyncAnchorTS = endTS = makeDaysBefore(startTS, -daysToSearch);
                if (this._syncThroughTS === null && TIME_DIR_AT_OR_BEYOND(this._curSyncDir, this._nextSyncAnchorTS, this._syncThroughTS)) {
                    endTS = null;
                }
            }
            this.folderConn.syncDateRange(startTS, endTS, this._curSyncAccuracyStamp, this.onSyncCompleted.bind(this));
        },
        allConsumersDead: function () {
            this.folderConn.relinquishConn();
        },
        shutdown: function () {
            this.folderConn.shutdown();
        }
    };
    function GmailMessageStorage() {
    }
    GmailMessageStorage.prototype = {};
});
;
(function (root, factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define('mimeparser-tzabbr', factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.tzabbr = factory();
    }
}(this, function () {
    'use strict';
    return {
        'ACDT': '+1030',
        'ACST': '+0930',
        'ACT': '+0800',
        'ADT': '-0300',
        'AEDT': '+1100',
        'AEST': '+1000',
        'AFT': '+0430',
        'AKDT': '-0800',
        'AKST': '-0900',
        'AMST': '-0300',
        'AMT': '+0400',
        'ART': '-0300',
        'AST': '+0300',
        'AWDT': '+0900',
        'AWST': '+0800',
        'AZOST': '-0100',
        'AZT': '+0400',
        'BDT': '+0800',
        'BIOT': '+0600',
        'BIT': '-1200',
        'BOT': '-0400',
        'BRT': '-0300',
        'BST': '+0600',
        'BTT': '+0600',
        'CAT': '+0200',
        'CCT': '+0630',
        'CDT': '-0500',
        'CEDT': '+0200',
        'CEST': '+0200',
        'CET': '+0100',
        'CHADT': '+1345',
        'CHAST': '+1245',
        'CHOT': '+0800',
        'CHST': '+1000',
        'CHUT': '+1000',
        'CIST': '-0800',
        'CIT': '+0800',
        'CKT': '-1000',
        'CLST': '-0300',
        'CLT': '-0400',
        'COST': '-0400',
        'COT': '-0500',
        'CST': '-0600',
        'CT': '+0800',
        'CVT': '-0100',
        'CWST': '+0845',
        'CXT': '+0700',
        'DAVT': '+0700',
        'DDUT': '+1000',
        'DFT': '+0100',
        'EASST': '-0500',
        'EAST': '-0600',
        'EAT': '+0300',
        'ECT': '-0500',
        'EDT': '-0400',
        'EEDT': '+0300',
        'EEST': '+0300',
        'EET': '+0200',
        'EGST': '+0000',
        'EGT': '-0100',
        'EIT': '+0900',
        'EST': '-0500',
        'FET': '+0300',
        'FJT': '+1200',
        'FKST': '-0300',
        'FKT': '-0400',
        'FNT': '-0200',
        'GALT': '-0600',
        'GAMT': '-0900',
        'GET': '+0400',
        'GFT': '-0300',
        'GILT': '+1200',
        'GIT': '-0900',
        'GMT': '+0000',
        'GST': '+0400',
        'GYT': '-0400',
        'HADT': '-0900',
        'HAEC': '+0200',
        'HAST': '-1000',
        'HKT': '+0800',
        'HMT': '+0500',
        'HOVT': '+0700',
        'HST': '-1000',
        'ICT': '+0700',
        'IDT': '+0300',
        'IOT': '+0300',
        'IRDT': '+0430',
        'IRKT': '+0900',
        'IRST': '+0330',
        'IST': '+0530',
        'JST': '+0900',
        'KGT': '+0600',
        'KOST': '+1100',
        'KRAT': '+0700',
        'KST': '+0900',
        'LHST': '+1030',
        'LINT': '+1400',
        'MAGT': '+1200',
        'MART': '-0930',
        'MAWT': '+0500',
        'MDT': '-0600',
        'MET': '+0100',
        'MEST': '+0200',
        'MHT': '+1200',
        'MIST': '+1100',
        'MIT': '-0930',
        'MMT': '+0630',
        'MSK': '+0400',
        'MST': '-0700',
        'MUT': '+0400',
        'MVT': '+0500',
        'MYT': '+0800',
        'NCT': '+1100',
        'NDT': '-0230',
        'NFT': '+1130',
        'NPT': '+0545',
        'NST': '-0330',
        'NT': '-0330',
        'NUT': '-1100',
        'NZDT': '+1300',
        'NZST': '+1200',
        'OMST': '+0700',
        'ORAT': '+0500',
        'PDT': '-0700',
        'PET': '-0500',
        'PETT': '+1200',
        'PGT': '+1000',
        'PHOT': '+1300',
        'PHT': '+0800',
        'PKT': '+0500',
        'PMDT': '-0200',
        'PMST': '-0300',
        'PONT': '+1100',
        'PST': '-0800',
        'PYST': '-0300',
        'PYT': '-0400',
        'RET': '+0400',
        'ROTT': '-0300',
        'SAKT': '+1100',
        'SAMT': '+0400',
        'SAST': '+0200',
        'SBT': '+1100',
        'SCT': '+0400',
        'SGT': '+0800',
        'SLST': '+0530',
        'SRT': '-0300',
        'SST': '+0800',
        'SYOT': '+0300',
        'TAHT': '-1000',
        'THA': '+0700',
        'TFT': '+0500',
        'TJT': '+0500',
        'TKT': '+1300',
        'TLT': '+0900',
        'TMT': '+0500',
        'TOT': '+1300',
        'TVT': '+1200',
        'UCT': '+0000',
        'ULAT': '+0800',
        'UTC': '+0000',
        'UYST': '-0200',
        'UYT': '-0300',
        'UZT': '+0500',
        'VET': '-0430',
        'VLAT': '+1000',
        'VOLT': '+0400',
        'VOST': '+0600',
        'VUT': '+1100',
        'WAKT': '+1200',
        'WAST': '+0200',
        'WAT': '+0100',
        'WEDT': '+0100',
        'WEST': '+0100',
        'WET': '+0000',
        'WST': '+0800',
        'YAKT': '+1000',
        'YEKT': '+0600',
        'Z': '+0000'
    };
}));
(function (root, factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define('mimeparser', [
            'mimefuncs',
            'addressparser',
            'mimeparser-tzabbr'
        ], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory(require('mimefuncs'), require('wo-addressparser'), require('./mimeparser-tzabbr'));
    } else {
        root.MimeParser = factory(root.mimefuncs, root.addressparser, root.tzabbr);
    }
}(this, function (mimefuncs, addressparser, tzabbr) {
    'use strict';
    function MimeParser() {
        this.running = true;
        this.nodes = {};
        this.node = new MimeNode(null, this);
        this._remainder = '';
    }
    MimeParser.prototype.write = function (chunk) {
        if (!chunk || !chunk.length) {
            return !this.running;
        }
        var lines = (this._remainder + (typeof chunk === 'object' ? mimefuncs.fromTypedArray(chunk) : chunk)).split(/\r?\n/g);
        this._remainder = lines.pop();
        for (var i = 0, len = lines.length; i < len; i++) {
            this.node.writeLine(lines[i]);
        }
        return !this.running;
    };
    MimeParser.prototype.end = function (chunk) {
        if (chunk && chunk.length) {
            this.write(chunk);
        }
        if (this.node._lineCount || this._remainder) {
            this.node.writeLine(this._remainder);
            this._remainder = '';
        }
        if (this.node) {
            this.node.finalize();
        }
        this.onend();
    };
    MimeParser.prototype.getNode = function (path) {
        path = path || '';
        return this.nodes['node' + path] || null;
    };
    MimeParser.prototype.onend = function () {
    };
    MimeParser.prototype.onheader = function () {
    };
    MimeParser.prototype.onbody = function () {
    };
    function MimeNode(parentNode, parser) {
        this.header = [];
        this.headers = {};
        this.path = parentNode ? parentNode.path.concat(parentNode._childNodes.length + 1) : [];
        this._parser = parser;
        this._parentNode = parentNode;
        this._state = 'HEADER';
        this._bodyBuffer = '';
        this._lineCount = 0;
        this._childNodes = false;
        this._currentChild = false;
        this._lineRemainder = '';
        this._isMultipart = false;
        this._multipartBoundary = false;
        this._isRfc822 = false;
        this.raw = '';
        this._parser.nodes['node' + this.path.join('.')] = this;
    }
    MimeNode.prototype.writeLine = function (line) {
        this.raw += (this.raw ? '\n' : '') + line;
        if (this._state === 'HEADER') {
            this._processHeaderLine(line);
        } else if (this._state === 'BODY') {
            this._processBodyLine(line);
        }
    };
    MimeNode.prototype.finalize = function () {
        if (this._isRfc822) {
            this._currentChild.finalize();
        } else {
            this._emitBody(true);
        }
    };
    MimeNode.prototype._processHeaderLine = function (line) {
        if (!line) {
            this._parseHeaders();
            this._parser.onheader(this);
            this._state = 'BODY';
            return;
        }
        if (line.match(/^\s/) && this.header.length) {
            this.header[this.header.length - 1] += '\n' + line;
        } else {
            this.header.push(line);
        }
    };
    MimeNode.prototype._parseHeaders = function () {
        var key, value, hasBinary;
        for (var i = 0, len = this.header.length; i < len; i++) {
            value = this.header[i].split(':');
            key = (value.shift() || '').trim().toLowerCase();
            value = (value.join(':') || '').replace(/\n/g, '').trim();
            if (value.match(/[\u0080-\uFFFF]/)) {
                if (!this.charset) {
                    hasBinary = true;
                }
                value = mimefuncs.charset.decode(mimefuncs.charset.convert(mimefuncs.toTypedArray(value), this.charset || 'iso-8859-1'));
            }
            if (!this.headers[key]) {
                this.headers[key] = [this._parseHeaderValue(key, value)];
            } else {
                this.headers[key].push(this._parseHeaderValue(key, value));
            }
            if (!this.charset && key === 'content-type') {
                this.charset = this.headers[key][this.headers[key].length - 1].params.charset;
            }
            if (hasBinary && this.charset) {
                hasBinary = false;
                this.headers = {};
                i = -1;
            }
        }
        this._processContentType();
        this._processContentTransferEncoding();
    };
    MimeNode.prototype._parseHeaderValue = function (key, value) {
        var parsedValue, isAddress = false;
        switch (key) {
        case 'content-type':
        case 'content-transfer-encoding':
        case 'content-disposition':
        case 'dkim-signature':
            parsedValue = mimefuncs.parseHeaderValue(value);
            break;
        case 'from':
        case 'sender':
        case 'to':
        case 'reply-to':
        case 'cc':
        case 'bcc':
        case 'abuse-reports-to':
        case 'errors-to':
        case 'return-path':
        case 'delivered-to':
            isAddress = true;
            parsedValue = { value: [].concat(addressparser.parse(value) || []) };
            break;
        case 'date':
            parsedValue = { value: this._parseDate(value) };
            break;
        default:
            parsedValue = { value: value };
        }
        parsedValue.initial = value;
        this._decodeHeaderCharset(parsedValue, { isAddress: isAddress });
        return parsedValue;
    };
    MimeNode.prototype._parseDate = function (str) {
        str = (str || '').toString().trim();
        var date = new Date(str);
        if (this._isValidDate(date)) {
            return date.toUTCString().replace(/GMT/, '+0000');
        }
        str = str.replace(/\b[a-z]+$/i, function (tz) {
            tz = tz.toUpperCase();
            if (tzabbr.hasOwnProperty(tz)) {
                return tzabbr[tz];
            }
            return tz;
        });
        date = new Date(str);
        if (this._isValidDate(date)) {
            return date.toUTCString().replace(/GMT/, '+0000');
        } else {
            return str;
        }
    };
    MimeNode.prototype._isValidDate = function (date) {
        return Object.prototype.toString.call(date) === '[object Date]' && date.toString() !== 'Invalid Date';
    };
    MimeNode.prototype._decodeHeaderCharset = function (parsed, options) {
        options = options || {};
        if (typeof parsed.value === 'string') {
            parsed.value = mimefuncs.mimeWordsDecode(parsed.value);
        }
        Object.keys(parsed.params || {}).forEach(function (key) {
            if (typeof parsed.params[key] === 'string') {
                parsed.params[key] = mimefuncs.mimeWordsDecode(parsed.params[key]);
            }
        });
        if (options.isAddress && Array.isArray(parsed.value)) {
            parsed.value.forEach(function (addr) {
                if (addr.name) {
                    addr.name = mimefuncs.mimeWordsDecode(addr.name);
                    if (Array.isArray(addr.group)) {
                        this._decodeHeaderCharset({ value: addr.group }, { isAddress: true });
                    }
                }
            }.bind(this));
        }
        return parsed;
    };
    MimeNode.prototype._processContentType = function () {
        var contentDisposition;
        this.contentType = this.headers['content-type'] && this.headers['content-type'][0] || mimefuncs.parseHeaderValue('text/plain');
        this.contentType.value = (this.contentType.value || '').toLowerCase().trim();
        this.contentType.type = this.contentType.value.split('/').shift() || 'text';
        if (this.contentType.params && this.contentType.params.charset && !this.charset) {
            this.charset = this.contentType.params.charset;
        }
        if (this.contentType.type === 'multipart' && this.contentType.params.boundary) {
            this._childNodes = [];
            this._isMultipart = this.contentType.value.split('/').pop() || 'mixed';
            this._multipartBoundary = this.contentType.params.boundary;
        }
        if (this.contentType.value === 'message/rfc822') {
            contentDisposition = this.headers['content-disposition'] && this.headers['content-disposition'][0] || mimefuncs.parseHeaderValue('');
            if ((contentDisposition.value || '').toLowerCase().trim() !== 'attachment') {
                this._childNodes = [];
                this._currentChild = new MimeNode(this, this._parser);
                this._childNodes.push(this._currentChild);
                this._isRfc822 = true;
            }
        }
    };
    MimeNode.prototype._processContentTransferEncoding = function () {
        this.contentTransferEncoding = this.headers['content-transfer-encoding'] && this.headers['content-transfer-encoding'][0] || mimefuncs.parseHeaderValue('7bit');
        this.contentTransferEncoding.value = (this.contentTransferEncoding.value || '').toLowerCase().trim();
    };
    MimeNode.prototype._processBodyLine = function (line) {
        var curLine, match;
        this._lineCount++;
        if (this._isMultipart) {
            if (line === '--' + this._multipartBoundary) {
                if (this._currentChild) {
                    this._currentChild.finalize();
                }
                this._currentChild = new MimeNode(this, this._parser);
                this._childNodes.push(this._currentChild);
            } else if (line === '--' + this._multipartBoundary + '--') {
                if (this._currentChild) {
                    this._currentChild.finalize();
                }
                this._currentChild = false;
            } else if (this._currentChild) {
                this._currentChild.writeLine(line);
            } else {
            }
        } else if (this._isRfc822) {
            this._currentChild.writeLine(line);
        } else {
            switch (this.contentTransferEncoding.value) {
            case 'base64':
                curLine = this._lineRemainder + line.trim();
                if (curLine.length % 4) {
                    this._lineRemainder = curLine.substr(-curLine.length % 4);
                    curLine = curLine.substr(0, curLine.length - this._lineRemainder.length);
                } else {
                    this._lineRemainder = '';
                }
                if (curLine.length) {
                    this._bodyBuffer += mimefuncs.fromTypedArray(mimefuncs.base64.decode(curLine));
                }
                break;
            case 'quoted-printable':
                curLine = this._lineRemainder + (this._lineCount > 1 ? '\n' : '') + line;
                if (match = curLine.match(/=[a-f0-9]{0,1}$/i)) {
                    this._lineRemainder = match[0];
                    curLine = curLine.substr(0, curLine.length - this._lineRemainder.length);
                } else {
                    this._lineRemainder = '';
                }
                this._bodyBuffer += curLine.replace(/\=(\r?\n|$)/g, '').replace(/=([a-f0-9]{2})/gi, function (m, code) {
                    return String.fromCharCode(parseInt(code, 16));
                });
                break;
            default:
                this._bodyBuffer += (this._lineCount > 1 ? '\n' : '') + line;
                break;
            }
        }
    };
    MimeNode.prototype._emitBody = function () {
        var contentDisposition = this.headers['content-disposition'] && this.headers['content-disposition'][0] || mimefuncs.parseHeaderValue('');
        var delSp;
        if (this._isMultipart || !this._bodyBuffer) {
            return;
        }
        if (/^text\/(plain|html)$/i.test(this.contentType.value) && this.contentType.params && /^flowed$/i.test(this.contentType.params.format)) {
            delSp = /^yes$/i.test(this.contentType.params.delsp);
            this._bodyBuffer = this._bodyBuffer.split('\n').reduce(function (previousValue, currentValue, index) {
                var body = previousValue;
                if (delSp) {
                    body = body.replace(/[ ]+$/, '');
                }
                if (/ $/.test(previousValue) && !/(^|\n)\-\- $/.test(previousValue)) {
                    return body + currentValue;
                } else {
                    return body + '\n' + currentValue;
                }
            }).replace(/^ /gm, '');
        }
        this.content = mimefuncs.toTypedArray(this._bodyBuffer);
        if (/^text\/(plain|html)$/i.test(this.contentType.value) && !/^attachment$/i.test(contentDisposition.value)) {
            if (!this.charset && /^text\/html$/i.test(this.contentType.value)) {
                this.charset = this._detectHTMLCharset(this._bodyBuffer);
            }
            if (!/^utf[\-_]?8$/i.test(this.charset)) {
                this.content = mimefuncs.charset.convert(mimefuncs.toTypedArray(this._bodyBuffer), this.charset || 'iso-8859-1');
            }
            this.charset = this.contentType.params.charset = 'utf-8';
        }
        this._bodyBuffer = '';
        this._parser.onbody(this, this.content);
    };
    MimeNode.prototype._detectHTMLCharset = function (html) {
        var charset, input, meta;
        if (typeof html !== 'string') {
            html = html.toString('ascii');
        }
        html = html.replace(/\r?\n|\r/g, ' ');
        if (meta = html.match(/<meta\s+http-equiv=["'\s]*content-type[^>]*?>/i)) {
            input = meta[0];
        }
        if (input) {
            charset = input.match(/charset\s?=\s?([a-zA-Z\-_:0-9]*);?/);
            if (charset) {
                charset = (charset[1] || '').trim().toLowerCase();
            }
        }
        if (!charset && (meta = html.match(/<meta\s+charset=["'\s]*([^"'<>\/\s]+)/i))) {
            charset = (meta[1] || '').trim().toLowerCase();
        }
        return charset;
    };
    return MimeParser;
}));
define('imap/jobs', [
    'logic',
    'mix',
    '../jobmixins',
    '../drafts/jobs',
    '../allback',
    'mimeparser',
    'module',
    'exports'
], function (logic, mix, $jobmixins, draftsJobs, allback, MimeParser, $module, exports) {
    var CHECKED_NOTYET = 'checked-notyet';
    var UNCHECKED_IDEMPOTENT = 'idempotent';
    var CHECKED_HAPPENED = 'happened';
    var CHECKED_MOOT = 'moot';
    var UNCHECKED_BAILED = 'bailed';
    var UNCHECKED_COHERENT_NOTYET = 'coherent-notyet';
    var FALLBACK_FOLDER_DELIM = '/';
    var deriveFolderPath = exports.deriveFolderPath = function (name, containOtherFolders, parentFolderInfo, personalNamespace) {
        var path, delim, depth;
        if (parentFolderInfo) {
            delim = parentFolderInfo.delim || personalNamespace.delimiter || FALLBACK_FOLDER_DELIM;
            path = parentFolderInfo.path || '';
            depth = parentFolderInfo.depth + 1;
        } else {
            delim = personalNamespace.delimiter || FALLBACK_FOLDER_DELIM;
            path = personalNamespace.prefix || '';
            depth = path ? 1 : 0;
        }
        if (path) {
            path += delim;
        }
        path += name;
        if (containOtherFolders) {
            path += delim;
        }
        return {
            path: path,
            delimiter: delim,
            depth: depth
        };
    };
    function ImapJobDriver(account, state) {
        this.account = account;
        this.resilientServerIds = false;
        this._heldMutexReleasers = [];
        logic.defineScope(this, 'ImapJobDriver', { accountId: this.account.id });
        this._state = state;
        if (!state.hasOwnProperty('suidToServerId')) {
            state.suidToServerId = {};
            state.moveMap = {};
        }
        this._stateDelta = {
            serverIdMap: null,
            moveMap: null
        };
    }
    exports.ImapJobDriver = ImapJobDriver;
    ImapJobDriver.prototype = {
        _accessFolderForMutation: function (folderId, needConn, callback, deathback, label) {
            var storage = this.account.getFolderStorageForFolderId(folderId), self = this;
            storage.runMutexed(label, function (releaseMutex) {
                var syncer = storage.folderSyncer;
                var action = function () {
                    self._heldMutexReleasers.push(releaseMutex);
                    try {
                        callback(syncer.folderConn, storage);
                    } catch (ex) {
                        logic(self, 'callbackErr', { ex: ex });
                    }
                };
                if (needConn && !storage.isLocalOnly) {
                    syncer.folderConn.withConnection(function () {
                        self._heldMutexReleasers.push(function () {
                            syncer.folderConn.clearErrorHandler();
                        });
                        action();
                    }, deathback, label, true);
                } else {
                    action();
                }
            });
        },
        _partitionAndAccessFoldersSequentially: $jobmixins._partitionAndAccessFoldersSequentially,
        _acquireConnWithoutFolder: function (label, callback, deathback) {
            logic(this, 'acquireConnWithoutFolder_begin', { label: label });
            var self = this;
            this.account.__folderDemandsConnection(null, label, function (conn) {
                logic(self, 'acquireConnWithoutFolder_end', { label: label });
                self._heldMutexReleasers.push(function () {
                    self.account.__folderDoneWithConnection(conn, false, false);
                });
                try {
                    callback(conn);
                } catch (ex) {
                    logic(self, 'callbackErr', { ex: ex });
                }
            }, deathback);
        },
        postJobCleanup: $jobmixins.postJobCleanup,
        allJobsDone: $jobmixins.allJobsDone,
        local_do_downloadBodies: $jobmixins.local_do_downloadBodies,
        do_downloadBodies: $jobmixins.do_downloadBodies,
        check_downloadBodies: $jobmixins.check_downloadBodies,
        local_do_downloadBodyReps: $jobmixins.local_do_downloadBodyReps,
        do_downloadBodyReps: $jobmixins.do_downloadBodyReps,
        check_downloadBodyReps: $jobmixins.check_downloadBodyReps,
        local_do_download: $jobmixins.local_do_download,
        do_download: $jobmixins.do_download,
        check_download: $jobmixins.check_download,
        local_undo_download: $jobmixins.local_undo_download,
        undo_download: $jobmixins.undo_download,
        local_do_upgradeDB: $jobmixins.local_do_upgradeDB,
        local_do_modtags: $jobmixins.local_do_modtags,
        do_modtags: function (op, jobDoneCallback, undo) {
            var addTags = undo ? op.removeTags : op.addTags, removeTags = undo ? op.addTags : op.removeTags;
            var aggrErr = null;
            this._partitionAndAccessFoldersSequentially(op.messages, true, function perFolder(folderConn, storage, serverIds, namers, callWhenDone) {
                var uids = [];
                for (var i = 0; i < serverIds.length; i++) {
                    var srvid = serverIds[i];
                    if (srvid)
                        uids.push(srvid);
                }
                if (!uids.length) {
                    callWhenDone();
                    return;
                }
                var latch = allback.latch();
                if (addTags) {
                    folderConn._conn.setFlags(uids.join(','), { add: addTags }, { byUid: true }, latch.defer('add'));
                } else if (removeTags) {
                    folderConn._conn.setFlags(uids.join(','), { remove: removeTags }, { byUid: true }, latch.defer('remove'));
                }
                latch.then(function (results) {
                    var err = results.add && results.add[0] || results.remove && results.remove[0];
                    if (err) {
                        console.error('failure modifying tags', err);
                        aggrErr = 'unknown';
                    } else {
                        op.progress += undo ? -serverIds.length : serverIds.length;
                    }
                    callWhenDone();
                });
            }, function allDone() {
                jobDoneCallback(aggrErr);
            }, function deadConn() {
                aggrErr = 'aborted-retry';
            }, undo, 'modtags');
        },
        check_modtags: function (op, callback) {
            callback(null, UNCHECKED_IDEMPOTENT);
        },
        local_undo_modtags: $jobmixins.local_undo_modtags,
        undo_modtags: function (op, callback) {
            return this.do_modtags(op, callback, true);
        },
        local_do_delete: $jobmixins.local_do_delete,
        do_delete: function (op, doneCallback) {
            var trashFolder = this.account.getFirstFolderWithType('trash');
            this.do_move(op, doneCallback, trashFolder.id);
        },
        check_delete: function (op, doneCallback) {
            var trashFolder = this.account.getFirstFolderWithType('trash');
            this.check_move(op, doneCallback, trashFolder.id);
        },
        local_undo_delete: $jobmixins.local_undo_delete,
        undo_delete: function (op, doneCallback) {
        },
        local_do_move: $jobmixins.local_do_move,
        do_move: function (op, jobDoneCallback, targetFolderId) {
            var state = this._state, stateDelta = this._stateDelta, aggrErr = null;
            if (!stateDelta.serverIdMap)
                stateDelta.serverIdMap = {};
            if (!targetFolderId)
                targetFolderId = op.targetFolder;
            this._partitionAndAccessFoldersSequentially(op.messages, true, function perFolder(folderConn, sourceStorage, serverIds, namers, perFolderDone) {
                var guidToNamer = {}, targetConn;
                function gotTargetConn(targetConn, targetStorage) {
                    var usingUid, nextId;
                    if (targetConn.box.uidNext) {
                        usingUid = true;
                        nextId = targetConn.box.uidNext;
                    } else {
                        usingUid = false;
                        nextId = targetConn.box.exists + 1;
                    }
                    folderConn._conn.copyMessages(serverIds.join(','), targetStorage.folderMeta.path, { byUid: true }, copiedMessages_reselect);
                    function copiedMessages_reselect() {
                        targetConn._conn.selectMailbox(targetStorage.folderMeta.path, copiedMessages_findNewUIDs);
                    }
                    function copiedMessages_findNewUIDs() {
                        var fetcher = targetConn._conn.listMessages(nextId + ':*', [
                            'UID',
                            'BODY.PEEK[HEADER.FIELDS (MESSAGE-ID)]'
                        ], { byUid: usingUid }, function (err, messages) {
                            if (err) {
                                perFolderDone();
                            } else {
                                var latch = allback.latch();
                                messages.forEach(function (msg) {
                                    var messageDone = latch.defer();
                                    for (var key in msg) {
                                        if (/header\.fields/.test(key)) {
                                            var headerParser = new MimeParser();
                                            headerParser.write(msg[key] + '\r\n');
                                            headerParser.end();
                                            msg.headers = headerParser.node.headers;
                                            break;
                                        }
                                    }
                                    var guid = msg.headers['message-id'] && msg.headers['message-id'][0] && msg.headers['message-id'][0].value;
                                    if (guid && guid[0] === '<') {
                                        guid = guid.slice(1, -1);
                                    }
                                    if (!guidToNamer.hasOwnProperty(guid)) {
                                        messageDone();
                                        return;
                                    }
                                    var namer = guidToNamer[guid];
                                    stateDelta.serverIdMap[namer.suid] = msg.uid;
                                    var newSuid = state.moveMap[namer.suid];
                                    var newId = parseInt(newSuid.substring(newSuid.lastIndexOf('/') + 1));
                                    targetStorage.updateMessageHeader(namer.date, newId, false, function (header) {
                                        if (header)
                                            header.srvid = msg.uid;
                                        else
                                            console.warn('did not find header for', namer.suid, newSuid, namer.date, newId);
                                        messageDone();
                                        return true;
                                    }, null);
                                });
                                latch.then(foundUIDs_deleteOriginals);
                            }
                        });
                    }
                }
                function foundUIDs_deleteOriginals() {
                    folderConn._conn.deleteMessages(serverIds.join(','), { byUid: true }, deletedMessages);
                }
                function deletedMessages(err) {
                    if (err)
                        aggrErr = true;
                    perFolderDone();
                }
                for (var i = namers.length - 1; i >= 0; i--) {
                    var srvid = serverIds[i];
                    if (!srvid) {
                        serverIds.splice(i, 1);
                        namers.splice(i, 1);
                        continue;
                    }
                    var namer = namers[i];
                    guidToNamer[namer.guid] = namer;
                }
                if (serverIds.length === 0) {
                    perFolderDone();
                    return;
                }
                if (sourceStorage.isLocalOnly) {
                    perFolderDone();
                } else if (sourceStorage.folderId === targetFolderId) {
                    if (op.type === 'move') {
                        perFolderDone();
                    } else {
                        foundUIDs_deleteOriginals();
                    }
                } else {
                    this._accessFolderForMutation(targetFolderId, true, gotTargetConn, function targetFolderDead() {
                    }, 'move target');
                }
            }.bind(this), function () {
                jobDoneCallback(aggrErr);
            }, null, false, 'server move source');
        },
        check_move: function (op, doneCallback, targetFolderId) {
            doneCallback(null, 'moot');
        },
        local_undo_move: $jobmixins.local_undo_move,
        undo_move: function (op, doneCallback, targetFolderId) {
            doneCallback('moot');
        },
        local_do_append: function (op, doneCallback) {
            doneCallback(null);
        },
        do_append: function (op, callback) {
            var folderConn, self = this, storage = this.account.getFolderStorageForFolderId(op.folderId), folderMeta = storage.folderMeta, iNextMessage = 0;
            var gotFolderConn = function gotFolderConn(_folderConn) {
                if (!_folderConn) {
                    done('unknown');
                    return;
                }
                folderConn = _folderConn;
                append();
            };
            var deadConn = function deadConn() {
                callback('aborted-retry');
            };
            var append = function append() {
                var message = op.messages[iNextMessage++];
                var str = new FileReaderSync().readAsBinaryString(message.messageText);
                folderConn._conn.upload(folderMeta.path, str, { flags: message.flags }, appended);
            };
            var appended = function appended(err) {
                if (err) {
                    console.error('failure appending message', err);
                    done('unknown');
                    return;
                }
                if (iNextMessage < op.messages.length)
                    append();
                else
                    done(null);
            };
            var done = function done(errString) {
                if (folderConn)
                    folderConn = null;
                callback(errString);
            };
            this._accessFolderForMutation(op.folderId, true, gotFolderConn, deadConn, 'append');
        },
        check_append: function (op, doneCallback) {
            doneCallback(null, 'moot');
        },
        local_undo_append: function (op, doneCallback) {
            doneCallback(null);
        },
        undo_append: function (op, doneCallback) {
            doneCallback('moot');
        },
        local_do_syncFolderList: function (op, doneCallback) {
            doneCallback(null);
        },
        do_syncFolderList: function (op, doneCallback) {
            var account = this.account, reported = false;
            this._acquireConnWithoutFolder('syncFolderList', function gotConn(conn) {
                account._syncFolderList(conn, function (err) {
                    if (!err)
                        account.meta.lastFolderSyncAt = Date.now();
                    if (!reported)
                        doneCallback(err ? 'aborted-retry' : null, null, !err);
                    reported = true;
                });
            }, function deadConn() {
                if (!reported)
                    doneCallback('aborted-retry');
                reported = true;
            });
        },
        check_syncFolderList: function (op, doneCallback) {
            doneCallback(null, 'coherent-notyet');
        },
        local_undo_syncFolderList: function (op, doneCallback) {
            doneCallback('moot');
        },
        undo_syncFolderList: function (op, doneCallback) {
            doneCallback('moot');
        },
        local_do_createFolder: function (op, doneCallback) {
            doneCallback(null);
        },
        do_createFolder: function (op, doneCallback) {
            var parentFolderInfo;
            if (op.parentFolderId) {
                if (!this.account._folderInfos.hasOwnProperty(op.parentFolderId)) {
                    throw new Error('No such folder: ' + op.parentFolderId);
                }
                parentFolderInfo = this.account._folderInfos[op.parentFolderId].$meta;
            }
            var personalNamespace = this.account._namespaces && this.account._namespaces.personal || {
                prefix: '',
                delimiter: FALLBACK_FOLDER_DELIM
            };
            var derivedInfo = deriveFolderPath(op.folderName, op.containOtherFolders, parentFolderInfo, personalNamespace);
            var path = derivedInfo.path;
            var scope = logic.subscope(this, { _path: path });
            var gotConn = function (conn) {
                logic(scope, 'creatingFolder', { _path: path });
                conn.createMailbox(path, addBoxCallback);
            }.bind(this);
            var addBoxCallback = function (err, alreadyExists) {
                if (err) {
                    if (err.message && /already/i.test(err.message)) {
                        alreadyExists = true;
                    } else {
                        logic(scope, 'createFolderErr', { err: err });
                        done('failure-give-up', null);
                        return;
                    }
                }
                logic(scope, 'createdFolder', { alreadyExists: alreadyExists });
                var folderMeta = this.account._learnAboutFolder(op.folderName, path, op.parentFolderId, op.folderType, derivedInfo.delimiter, derivedInfo.depth, false);
                done(null, folderMeta);
            }.bind(this);
            function done(errString, folderMeta) {
                if (doneCallback) {
                    doneCallback(errString, folderMeta);
                    doneCallback = null;
                }
            }
            function deadConn() {
                done('aborted-retry', null);
            }
            var existingFolder = this.account.getFolderByPath(path);
            if (existingFolder) {
                done(null, existingFolder);
            } else {
                this._acquireConnWithoutFolder('createFolder', gotConn, deadConn);
            }
        },
        check_createFolder: function (op, doneCallback) {
            doneCallback('moot');
        },
        local_undo_createFolder: function (op, doneCallback) {
            doneCallback(null);
        },
        undo_createFolder: function (op, doneCallback) {
            doneCallback('moot');
        },
        local_do_purgeExcessMessages: function (op, doneCallback) {
            this._accessFolderForMutation(op.folderId, false, function withMutex(_ignoredConn, storage) {
                storage.purgeExcessMessages(function (numDeleted, cutTS) {
                    doneCallback(null, null, numDeleted > 0);
                });
            }, null, 'purgeExcessMessages');
        },
        do_purgeExcessMessages: function (op, doneCallback) {
            doneCallback(null);
        },
        check_purgeExcessMessages: function (op, doneCallback) {
            return UNCHECKED_IDEMPOTENT;
        },
        local_undo_purgeExcessMessages: function (op, doneCallback) {
            doneCallback(null);
        },
        undo_purgeExcessMessages: function (op, doneCallback) {
            doneCallback(null);
        },
        local_do_sendOutboxMessages: $jobmixins.local_do_sendOutboxMessages,
        do_sendOutboxMessages: $jobmixins.do_sendOutboxMessages,
        check_sendOutboxMessages: $jobmixins.check_sendOutboxMessages,
        local_undo_sendOutboxMessages: $jobmixins.local_undo_sendOutboxMessages,
        undo_sendOutboxMessages: $jobmixins.undo_sendOutboxMessages,
        local_do_setOutboxSyncEnabled: $jobmixins.local_do_setOutboxSyncEnabled
    };
    function HighLevelJobDriver() {
    }
    HighLevelJobDriver.prototype = {
        do_xmove: function () {
        },
        check_xmove: function () {
        },
        undo_xmove: function () {
        },
        do_xcopy: function () {
        },
        check_xcopy: function () {
        },
        undo_xcopy: function () {
        }
    };
    mix(ImapJobDriver.prototype, draftsJobs.draftsMixins);
});
;
(function (root, factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define('imap-formal-syntax', factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.imapFormalSyntax = factory();
    }
}(this, function () {
    'use strict';
    function expandRange(start, end) {
        var chars = [];
        for (var i = start; i <= end; i++) {
            chars.push(i);
        }
        return String.fromCharCode.apply(String, chars);
    }
    function excludeChars(source, exclude) {
        var sourceArr = Array.prototype.slice.call(source);
        for (var i = sourceArr.length - 1; i >= 0; i--) {
            if (exclude.indexOf(sourceArr[i]) >= 0) {
                sourceArr.splice(i, 1);
            }
        }
        return sourceArr.join('');
    }
    return {
        CHAR: function () {
            var value = expandRange(1, 127);
            this.CHAR = function () {
                return value;
            };
            return value;
        },
        CHAR8: function () {
            var value = expandRange(1, 255);
            this.CHAR8 = function () {
                return value;
            };
            return value;
        },
        SP: function () {
            return ' ';
        },
        CTL: function () {
            var value = expandRange(0, 31) + '\x7F';
            this.CTL = function () {
                return value;
            };
            return value;
        },
        DQUOTE: function () {
            return '"';
        },
        ALPHA: function () {
            var value = expandRange(65, 90) + expandRange(97, 122);
            this.ALPHA = function () {
                return value;
            };
            return value;
        },
        DIGIT: function () {
            var value = expandRange(48, 57) + expandRange(97, 122);
            this.DIGIT = function () {
                return value;
            };
            return value;
        },
        'ATOM-CHAR': function () {
            var value = excludeChars(this.CHAR(), this['atom-specials']());
            this['ATOM-CHAR'] = function () {
                return value;
            };
            return value;
        },
        'ASTRING-CHAR': function () {
            var value = this['ATOM-CHAR']() + this['resp-specials']();
            this['ASTRING-CHAR'] = function () {
                return value;
            };
            return value;
        },
        'TEXT-CHAR': function () {
            var value = excludeChars(this.CHAR(), '\r\n');
            this['TEXT-CHAR'] = function () {
                return value;
            };
            return value;
        },
        'atom-specials': function () {
            var value = '(' + ')' + '{' + this.SP() + this.CTL() + this['list-wildcards']() + this['quoted-specials']() + this['resp-specials']();
            this['atom-specials'] = function () {
                return value;
            };
            return value;
        },
        'list-wildcards': function () {
            return '%' + '*';
        },
        'quoted-specials': function () {
            var value = this.DQUOTE() + '\\';
            this['quoted-specials'] = function () {
                return value;
            };
            return value;
        },
        'resp-specials': function () {
            return ']';
        },
        tag: function () {
            var value = excludeChars(this['ASTRING-CHAR'](), '+');
            this.tag = function () {
                return value;
            };
            return value;
        },
        command: function () {
            var value = this.ALPHA() + this.DIGIT();
            this.command = function () {
                return value;
            };
            return value;
        },
        verify: function (str, allowedChars) {
            for (var i = 0, len = str.length; i < len; i++) {
                if (allowedChars.indexOf(str.charAt(i)) < 0) {
                    return i;
                }
            }
            return -1;
        }
    };
}));
(function (root, factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define('imap-handler/src/imap-parser', ['imap-formal-syntax'], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory(require('./imap-formal-syntax'));
    } else {
        root.imapParser = factory(root.imapFormalSyntax);
    }
}(this, function (imapFormalSyntax) {
    'use strict';
    function ParserInstance(input, options) {
        this.input = (input || '').toString();
        this.options = options || {};
        this.remainder = this.input;
        this.pos = 0;
    }
    ParserInstance.prototype.getTag = function () {
        if (!this.tag) {
            this.tag = this.getElement(imapFormalSyntax.tag() + '*+', true);
        }
        return this.tag;
    };
    ParserInstance.prototype.getCommand = function () {
        var responseCode;
        if (!this.command) {
            this.command = this.getElement(imapFormalSyntax.command());
        }
        switch ((this.command || '').toString().toUpperCase()) {
        case 'OK':
        case 'NO':
        case 'BAD':
        case 'PREAUTH':
        case 'BYE':
            responseCode = this.remainder.match(/^ \[(?:[^\]]*\])+/);
            if (responseCode) {
                this.humanReadable = this.remainder.substr(responseCode[0].length).trim();
                this.remainder = responseCode[0];
            } else {
                this.humanReadable = this.remainder.trim();
                this.remainder = '';
            }
            break;
        }
        return this.command;
    };
    ParserInstance.prototype.getElement = function (syntax) {
        var match, element, errPos;
        if (this.remainder.match(/^\s/)) {
            throw new Error('Unexpected whitespace at position ' + this.pos);
        }
        if (match = this.remainder.match(/^[^\s]+(?=\s|$)/)) {
            element = match[0];
            if ((errPos = imapFormalSyntax.verify(element, syntax)) >= 0) {
                throw new Error('Unexpected char at position ' + (this.pos + errPos));
            }
        } else {
            throw new Error('Unexpected end of input at position ' + this.pos);
        }
        this.pos += match[0].length;
        this.remainder = this.remainder.substr(match[0].length);
        return element;
    };
    ParserInstance.prototype.getSpace = function () {
        if (!this.remainder.length) {
            throw new Error('Unexpected end of input at position ' + this.pos);
        }
        if (imapFormalSyntax.verify(this.remainder.charAt(0), imapFormalSyntax.SP()) >= 0) {
            throw new Error('Unexpected char at position ' + this.pos);
        }
        this.pos++;
        this.remainder = this.remainder.substr(1);
    };
    ParserInstance.prototype.getAttributes = function () {
        if (!this.remainder.length) {
            throw new Error('Unexpected end of input at position ' + this.pos);
        }
        if (this.remainder.match(/^\s/)) {
            throw new Error('Unexpected whitespace at position ' + this.pos);
        }
        return new TokenParser(this, this.pos, this.remainder, this.options).getAttributes();
    };
    function TokenParser(parent, startPos, str, options) {
        this.str = (str || '').toString();
        this.options = options || {};
        this.parent = parent;
        this.tree = this.currentNode = this.createNode();
        this.pos = startPos || 0;
        this.currentNode.type = 'TREE';
        this.state = 'NORMAL';
        this.processString();
    }
    TokenParser.prototype.getAttributes = function () {
        var attributes = [], branch = attributes;
        var walk = function (node) {
            var elm, curBranch = branch, partial;
            if (!node.closed && node.type === 'SEQUENCE' && node.value === '*') {
                node.closed = true;
                node.type = 'ATOM';
            }
            if (!node.closed) {
                throw new Error('Unexpected end of input at position ' + (this.pos + this.str.length - 1));
            }
            switch (node.type.toUpperCase()) {
            case 'LITERAL':
            case 'STRING':
            case 'SEQUENCE':
                elm = {
                    type: node.type.toUpperCase(),
                    value: node.value
                };
                branch.push(elm);
                break;
            case 'ATOM':
                if (node.value.toUpperCase() === 'NIL') {
                    branch.push(null);
                    break;
                }
                elm = {
                    type: node.type.toUpperCase(),
                    value: node.value
                };
                branch.push(elm);
                break;
            case 'SECTION':
                branch = branch[branch.length - 1].section = [];
                break;
            case 'LIST':
                elm = [];
                branch.push(elm);
                branch = elm;
                break;
            case 'PARTIAL':
                partial = node.value.split('.').map(Number);
                if (partial.slice(-1)[0] < partial.slice(0, 1)[0]) {
                    throw new Error('Invalid partial value at position ' + node.startPos);
                }
                branch[branch.length - 1].partial = partial;
                break;
            }
            node.childNodes.forEach(function (childNode) {
                walk(childNode);
            });
            branch = curBranch;
        }.bind(this);
        walk(this.tree);
        return attributes;
    };
    TokenParser.prototype.createNode = function (parentNode, startPos) {
        var node = {
            childNodes: [],
            type: false,
            value: '',
            closed: true
        };
        if (parentNode) {
            node.parentNode = parentNode;
        }
        if (typeof startPos === 'number') {
            node.startPos = startPos;
        }
        if (parentNode) {
            parentNode.childNodes.push(node);
        }
        return node;
    };
    TokenParser.prototype.processString = function () {
        var chr, i, len, checkSP = function () {
                while (this.str.charAt(i + 1) === ' ') {
                    i++;
                }
            }.bind(this);
        for (i = 0, len = this.str.length; i < len; i++) {
            chr = this.str.charAt(i);
            switch (this.state) {
            case 'NORMAL':
                switch (chr) {
                case '"':
                    this.currentNode = this.createNode(this.currentNode, this.pos + i);
                    this.currentNode.type = 'string';
                    this.state = 'STRING';
                    this.currentNode.closed = false;
                    break;
                case '(':
                    this.currentNode = this.createNode(this.currentNode, this.pos + i);
                    this.currentNode.type = 'LIST';
                    this.currentNode.closed = false;
                    break;
                case ')':
                    if (this.currentNode.type !== 'LIST') {
                        throw new Error('Unexpected list terminator ) at position ' + (this.pos + i));
                    }
                    this.currentNode.closed = true;
                    this.currentNode.endPos = this.pos + i;
                    this.currentNode = this.currentNode.parentNode;
                    checkSP();
                    break;
                case ']':
                    if (this.currentNode.type !== 'SECTION') {
                        throw new Error('Unexpected section terminator ] at position ' + (this.pos + i));
                    }
                    this.currentNode.closed = true;
                    this.currentNode.endPos = this.pos + i;
                    this.currentNode = this.currentNode.parentNode;
                    checkSP();
                    break;
                case '<':
                    if (this.str.charAt(i - 1) !== ']') {
                        this.currentNode = this.createNode(this.currentNode, this.pos + i);
                        this.currentNode.type = 'ATOM';
                        this.currentNode.value = chr;
                        this.state = 'ATOM';
                    } else {
                        this.currentNode = this.createNode(this.currentNode, this.pos + i);
                        this.currentNode.type = 'PARTIAL';
                        this.state = 'PARTIAL';
                        this.currentNode.closed = false;
                    }
                    break;
                case '{':
                    this.currentNode = this.createNode(this.currentNode, this.pos + i);
                    this.currentNode.type = 'LITERAL';
                    this.state = 'LITERAL';
                    this.currentNode.closed = false;
                    break;
                case '*':
                    this.currentNode = this.createNode(this.currentNode, this.pos + i);
                    this.currentNode.type = 'SEQUENCE';
                    this.currentNode.value = chr;
                    this.currentNode.closed = false;
                    this.state = 'SEQUENCE';
                    break;
                case ' ':
                    break;
                case '[':
                    if ([
                            'OK',
                            'NO',
                            'BAD',
                            'BYE',
                            'PREAUTH'
                        ].indexOf(this.parent.command.toUpperCase()) >= 0 && this.currentNode === this.tree) {
                        this.currentNode.endPos = this.pos + i;
                        this.currentNode = this.createNode(this.currentNode, this.pos + i);
                        this.currentNode.type = 'ATOM';
                        this.currentNode = this.createNode(this.currentNode, this.pos + i);
                        this.currentNode.type = 'SECTION';
                        this.currentNode.closed = false;
                        this.state = 'NORMAL';
                        if (this.str.substr(i + 1, 9).toUpperCase() === 'REFERRAL ') {
                            this.currentNode = this.createNode(this.currentNode, this.pos + i + 1);
                            this.currentNode.type = 'ATOM';
                            this.currentNode.endPos = this.pos + i + 8;
                            this.currentNode.value = 'REFERRAL';
                            this.currentNode = this.currentNode.parentNode;
                            this.currentNode = this.createNode(this.currentNode, this.pos + i + 10);
                            this.currentNode.type = 'ATOM';
                            i = this.str.indexOf(']', i + 10);
                            this.currentNode.endPos = this.pos + i - 1;
                            this.currentNode.value = this.str.substring(this.currentNode.startPos - this.pos, this.currentNode.endPos - this.pos + 1);
                            this.currentNode = this.currentNode.parentNode;
                            this.currentNode.closed = true;
                            this.currentNode = this.currentNode.parentNode;
                            checkSP();
                        }
                        break;
                    }
                default:
                    if (imapFormalSyntax['ATOM-CHAR']().indexOf(chr) < 0 && chr !== '\\' && chr !== '%') {
                        throw new Error('Unexpected char at position ' + (this.pos + i));
                    }
                    this.currentNode = this.createNode(this.currentNode, this.pos + i);
                    this.currentNode.type = 'ATOM';
                    this.currentNode.value = chr;
                    this.state = 'ATOM';
                    break;
                }
                break;
            case 'ATOM':
                if (chr === ' ') {
                    this.currentNode.endPos = this.pos + i - 1;
                    this.currentNode = this.currentNode.parentNode;
                    this.state = 'NORMAL';
                    break;
                }
                if (this.currentNode.parentNode && (chr === ')' && this.currentNode.parentNode.type === 'LIST' || chr === ']' && this.currentNode.parentNode.type === 'SECTION')) {
                    this.currentNode.endPos = this.pos + i - 1;
                    this.currentNode = this.currentNode.parentNode;
                    this.currentNode.closed = true;
                    this.currentNode.endPos = this.pos + i;
                    this.currentNode = this.currentNode.parentNode;
                    this.state = 'NORMAL';
                    checkSP();
                    break;
                }
                if ((chr === ',' || chr === ':') && this.currentNode.value.match(/^\d+$/)) {
                    this.currentNode.type = 'SEQUENCE';
                    this.currentNode.closed = true;
                    this.state = 'SEQUENCE';
                }
                if (chr === '[') {
                    if ([
                            'BODY',
                            'BODY.PEEK'
                        ].indexOf(this.currentNode.value.toUpperCase()) < 0) {
                        throw new Error('Unexpected section start char [ at position ' + this.pos);
                    }
                    this.currentNode.endPos = this.pos + i;
                    this.currentNode = this.createNode(this.currentNode.parentNode, this.pos + i);
                    this.currentNode.type = 'SECTION';
                    this.currentNode.closed = false;
                    this.state = 'NORMAL';
                    break;
                }
                if (chr === '<') {
                    throw new Error('Unexpected start of partial at position ' + this.pos);
                }
                if (imapFormalSyntax['ATOM-CHAR']().indexOf(chr) < 0 && chr !== ']' && !(chr === '*' && this.currentNode.value === '\\')) {
                    throw new Error('Unexpected char at position ' + (this.pos + i));
                } else if (this.currentNode.value === '\\*') {
                    throw new Error('Unexpected char at position ' + (this.pos + i));
                }
                this.currentNode.value += chr;
                break;
            case 'STRING':
                if (chr === '"') {
                    this.currentNode.endPos = this.pos + i;
                    this.currentNode.closed = true;
                    this.currentNode = this.currentNode.parentNode;
                    this.state = 'NORMAL';
                    checkSP();
                    break;
                }
                if (chr === '\\') {
                    i++;
                    if (i >= len) {
                        throw new Error('Unexpected end of input at position ' + (this.pos + i));
                    }
                    chr = this.str.charAt(i);
                }
                this.currentNode.value += chr;
                break;
            case 'PARTIAL':
                if (chr === '>') {
                    if (this.currentNode.value.substr(-1) === '.') {
                        throw new Error('Unexpected end of partial at position ' + this.pos);
                    }
                    this.currentNode.endPos = this.pos + i;
                    this.currentNode.closed = true;
                    this.currentNode = this.currentNode.parentNode;
                    this.state = 'NORMAL';
                    checkSP();
                    break;
                }
                if (chr === '.' && (!this.currentNode.value.length || this.currentNode.value.match(/\./))) {
                    throw new Error('Unexpected partial separator . at position ' + this.pos);
                }
                if (imapFormalSyntax.DIGIT().indexOf(chr) < 0 && chr !== '.') {
                    throw new Error('Unexpected char at position ' + (this.pos + i));
                }
                if (this.currentNode.value.match(/^0$|\.0$/) && chr !== '.') {
                    throw new Error('Invalid partial at position ' + (this.pos + i));
                }
                this.currentNode.value += chr;
                break;
            case 'LITERAL':
                if (this.currentNode.started) {
                    if (chr === '\0') {
                        throw new Error('Unexpected \\x00 at position ' + (this.pos + i));
                    }
                    this.currentNode.value += chr;
                    if (this.currentNode.value.length >= this.currentNode.literalLength) {
                        this.currentNode.endPos = this.pos + i;
                        this.currentNode.closed = true;
                        this.currentNode = this.currentNode.parentNode;
                        this.state = 'NORMAL';
                        checkSP();
                    }
                    break;
                }
                if (chr === '+' && this.options.literalPlus) {
                    this.currentNode.literalPlus = true;
                    break;
                }
                if (chr === '}') {
                    if (!('literalLength' in this.currentNode)) {
                        throw new Error('Unexpected literal prefix end char } at position ' + (this.pos + i));
                    }
                    if (this.str.charAt(i + 1) === '\n') {
                        i++;
                    } else if (this.str.charAt(i + 1) === '\r' && this.str.charAt(i + 2) === '\n') {
                        i += 2;
                    } else {
                        throw new Error('Unexpected char at position ' + (this.pos + i));
                    }
                    this.currentNode.literalLength = Number(this.currentNode.literalLength);
                    this.currentNode.started = true;
                    if (!this.currentNode.literalLength) {
                        this.currentNode.endPos = this.pos + i;
                        this.currentNode.closed = true;
                        this.currentNode = this.currentNode.parentNode;
                        this.state = 'NORMAL';
                        checkSP();
                    }
                    break;
                }
                if (imapFormalSyntax.DIGIT().indexOf(chr) < 0) {
                    throw new Error('Unexpected char at position ' + (this.pos + i));
                }
                if (this.currentNode.literalLength === '0') {
                    throw new Error('Invalid literal at position ' + (this.pos + i));
                }
                this.currentNode.literalLength = (this.currentNode.literalLength || '') + chr;
                break;
            case 'SEQUENCE':
                if (chr === ' ') {
                    if (!this.currentNode.value.substr(-1).match(/\d/) && this.currentNode.value.substr(-1) !== '*') {
                        throw new Error('Unexpected whitespace at position ' + (this.pos + i));
                    }
                    if (this.currentNode.value.substr(-1) === '*' && this.currentNode.value.substr(-2, 1) !== ':') {
                        throw new Error('Unexpected whitespace at position ' + (this.pos + i));
                    }
                    this.currentNode.closed = true;
                    this.currentNode.endPos = this.pos + i - 1;
                    this.currentNode = this.currentNode.parentNode;
                    this.state = 'NORMAL';
                    break;
                } else if (this.currentNode.parentNode && chr === ']' && this.currentNode.parentNode.type === 'SECTION') {
                    this.currentNode.endPos = this.pos + i - 1;
                    this.currentNode = this.currentNode.parentNode;
                    this.currentNode.closed = true;
                    this.currentNode.endPos = this.pos + i;
                    this.currentNode = this.currentNode.parentNode;
                    this.state = 'NORMAL';
                    checkSP();
                    break;
                }
                if (chr === ':') {
                    if (!this.currentNode.value.substr(-1).match(/\d/) && this.currentNode.value.substr(-1) !== '*') {
                        throw new Error('Unexpected range separator : at position ' + (this.pos + i));
                    }
                } else if (chr === '*') {
                    if ([
                            ',',
                            ':'
                        ].indexOf(this.currentNode.value.substr(-1)) < 0) {
                        throw new Error('Unexpected range wildcard at position ' + (this.pos + i));
                    }
                } else if (chr === ',') {
                    if (!this.currentNode.value.substr(-1).match(/\d/) && this.currentNode.value.substr(-1) !== '*') {
                        throw new Error('Unexpected sequence separator , at position ' + (this.pos + i));
                    }
                    if (this.currentNode.value.substr(-1) === '*' && this.currentNode.value.substr(-2, 1) !== ':') {
                        throw new Error('Unexpected sequence separator , at position ' + (this.pos + i));
                    }
                } else if (!chr.match(/\d/)) {
                    throw new Error('Unexpected char at position ' + (this.pos + i));
                }
                if (chr.match(/\d/) && this.currentNode.value.substr(-1) === '*') {
                    throw new Error('Unexpected number at position ' + (this.pos + i));
                }
                this.currentNode.value += chr;
                break;
            }
        }
    };
    return function (command, options) {
        var parser, response = {};
        options = options || {};
        parser = new ParserInstance(command, options);
        response.tag = parser.getTag();
        parser.getSpace();
        response.command = parser.getCommand();
        if ([
                'UID',
                'AUTHENTICATE'
            ].indexOf((response.command || '').toUpperCase()) >= 0) {
            parser.getSpace();
            response.command += ' ' + parser.getElement(imapFormalSyntax.command());
        }
        if (parser.remainder.trim().length) {
            parser.getSpace();
            response.attributes = parser.getAttributes();
        }
        if (parser.humanReadable) {
            response.attributes = (response.attributes || []).concat({
                type: 'TEXT',
                value: parser.humanReadable
            });
        }
        return response;
    };
}));
(function (root, factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define('imap-handler/src/imap-compiler', ['imap-formal-syntax'], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory(require('./imap-formal-syntax'));
    } else {
        root.imapCompiler = factory(root.imapFormalSyntax);
    }
}(this, function (imapFormalSyntax) {
    'use strict';
    return function (response, asArray, isLogging) {
        var respParts = [], resp = (response.tag || '') + (response.command ? ' ' + response.command : ''), val, lastType, walk = function (node) {
                if (lastType === 'LITERAL' || [
                        '(',
                        '<',
                        '['
                    ].indexOf(resp.substr(-1)) < 0 && resp.length) {
                    resp += ' ';
                }
                if (Array.isArray(node)) {
                    lastType = 'LIST';
                    resp += '(';
                    node.forEach(walk);
                    resp += ')';
                    return;
                }
                if (!node && typeof node !== 'string' && typeof node !== 'number') {
                    resp += 'NIL';
                    return;
                }
                if (typeof node === 'string') {
                    if (isLogging && node.length > 20) {
                        resp += '"(* ' + node.length + 'B string *)"';
                    } else {
                        resp += JSON.stringify(node);
                    }
                    return;
                }
                if (typeof node === 'number') {
                    resp += Math.round(node) || 0;
                    return;
                }
                lastType = node.type;
                if (isLogging && node.sensitive) {
                    resp += '"(* value hidden *)"';
                    return;
                }
                switch (node.type.toUpperCase()) {
                case 'LITERAL':
                    if (isLogging) {
                        resp += '"(* ' + node.value.length + 'B literal *)"';
                    } else {
                        if (!node.value) {
                            resp += '{0}\r\n';
                        } else {
                            resp += '{' + node.value.length + '}\r\n';
                        }
                        respParts.push(resp);
                        resp = node.value || '';
                    }
                    break;
                case 'STRING':
                    if (isLogging && node.value.length > 20) {
                        resp += '"(* ' + node.value.length + 'B string *)"';
                    } else {
                        resp += JSON.stringify(node.value || '');
                    }
                    break;
                case 'TEXT':
                case 'SEQUENCE':
                    resp += node.value || '';
                    break;
                case 'NUMBER':
                    resp += node.value || 0;
                    break;
                case 'ATOM':
                case 'SECTION':
                    val = node.value || '';
                    if (imapFormalSyntax.verify(val.charAt(0) === '\\' ? val.substr(1) : val, imapFormalSyntax['ATOM-CHAR']()) >= 0) {
                        val = JSON.stringify(val);
                    }
                    resp += val;
                    if (node.section) {
                        resp += '[';
                        node.section.forEach(walk);
                        resp += ']';
                    }
                    if (node.partial) {
                        resp += '<' + node.partial.join('.') + '>';
                    }
                    break;
                }
            };
        [].concat(response.attributes || []).forEach(walk);
        if (resp.length) {
            respParts.push(resp);
        }
        return asArray ? respParts : respParts.join('');
    };
}));
(function (root, factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define('imap-handler/src/imap-handler', [
            './imap-parser',
            './imap-compiler'
        ], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory(require('./imap-parser'), require('./imap-compiler'));
    } else {
        root.imapHandler = factory(root.imapParser, root.imapCompiler);
    }
}(this, function (imapParser, imapCompiler) {
    'use strict';
    return {
        parser: imapParser,
        compiler: imapCompiler
    };
}));
define('imap-handler', ['./imap-handler/src/imap-handler'], function (imapHandler) {
    return imapHandler;
});
define('axeshim-browserbox', [
    'require',
    'logic'
], function (require) {
    var logic = require('logic');
    var scope = logic.scope('BrowserBox');
    return {
        debug: function (ignoredTag, msg) {
            if (!logic.isCensored) {
                logic(scope, 'debug', { msg: msg });
            }
        },
        log: function (ignoredTag, msg) {
            logic(scope, 'log', { msg: msg });
        },
        warn: function (ignoredTag, msg) {
            logic(scope, 'warn', { msg: msg });
        },
        error: function (ignoredTag, msg) {
            logic(scope, 'error', { msg: msg });
        }
    };
});
(function (root, factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define('browserbox-imap', [
            'tcp-socket',
            'imap-handler',
            'mimefuncs',
            'axe'
        ], function (TCPSocket, imapHandler, mimefuncs, axe) {
            return factory(TCPSocket, imapHandler, mimefuncs, axe);
        });
    } else if (typeof exports === 'object') {
        module.exports = factory(require('tcp-socket'), require('wo-imap-handler'), require('mimefuncs'), require('axe-logger'));
    } else {
        root.BrowserboxImapClient = factory(navigator.TCPSocket, root.imapHandler, root.mimefuncs, root.axe);
    }
}(this, function (TCPSocket, imapHandler, mimefuncs, axe) {
    'use strict';
    var DEBUG_TAG = 'browserbox IMAP';
    function ImapClient(host, port, options) {
        this._TCPSocket = TCPSocket;
        this.options = options || {};
        this.port = port || (this.options.useSecureTransport ? 993 : 143);
        this.host = host || 'localhost';
        this.options.useSecureTransport = 'useSecureTransport' in this.options ? !!this.options.useSecureTransport : this.port === 993;
        this.options.auth = this.options.auth || false;
        this.socket = false;
        this.destroyed = false;
        this.waitDrain = false;
        this.secureMode = !!this.options.useSecureTransport;
        this._connectionReady = false;
        this._remainder = '';
        this._command = '';
        this._literalRemaining = 0;
        this._processingServerData = false;
        this._serverQueue = [];
        this._canSend = false;
        this._clientQueue = [];
        this._tagCounter = 0;
        this._currentCommand = false;
        this._globalAcceptUntagged = {};
        this._idleTimer = false;
        this._socketTimeoutTimer = false;
    }
    ImapClient.prototype.TIMEOUT_ENTER_IDLE = 1000;
    ImapClient.prototype.TIMEOUT_SOCKET_LOWER_BOUND = 10000;
    ImapClient.prototype.TIMEOUT_SOCKET_MULTIPLIER = 0.1;
    ImapClient.prototype.onerror = function () {
    };
    ImapClient.prototype.ondrain = function () {
    };
    ImapClient.prototype.onclose = function () {
    };
    ImapClient.prototype.onready = function () {
    };
    ImapClient.prototype.onidle = function () {
    };
    ImapClient.prototype.connect = function () {
        this.socket = this._TCPSocket.open(this.host, this.port, {
            binaryType: 'arraybuffer',
            useSecureTransport: this.secureMode,
            ca: this.options.ca,
            tlsWorkerPath: this.options.tlsWorkerPath
        });
        try {
            this.socket.oncert = this.oncert;
        } catch (E) {
        }
        this.socket.onerror = this._onError.bind(this);
        this.socket.onopen = this._onOpen.bind(this);
    };
    ImapClient.prototype.close = function () {
        if (this.socket && this.socket.readyState === 'open') {
            this.socket.close();
        } else {
            this._destroy();
        }
    };
    ImapClient.prototype.upgrade = function (callback) {
        if (this.secureMode) {
            return callback(null, false);
        }
        this.secureMode = true;
        this.socket.upgradeToSecure();
        callback(null, true);
    };
    ImapClient.prototype.exec = function (request, acceptUntagged, options, callback) {
        if (typeof request === 'string') {
            request = { command: request };
        }
        this._addToClientQueue(request, acceptUntagged, options, callback);
        return this;
    };
    ImapClient.prototype.send = function (str) {
        var buffer = mimefuncs.toTypedArray(str).buffer, timeout = this.TIMEOUT_SOCKET_LOWER_BOUND + Math.floor(buffer.byteLength * this.TIMEOUT_SOCKET_MULTIPLIER);
        clearTimeout(this._socketTimeoutTimer);
        this._socketTimeoutTimer = setTimeout(this._onTimeout.bind(this), timeout);
        this.waitDrain = this.socket.send(buffer);
    };
    ImapClient.prototype.setHandler = function (command, callback) {
        this._globalAcceptUntagged[(command || '').toString().toUpperCase().trim()] = callback;
    };
    ImapClient.prototype._onError = function (evt) {
        if (this.isError(evt)) {
            this.onerror(evt);
        } else if (evt && this.isError(evt.data)) {
            this.onerror(evt.data);
        } else {
            this.onerror(new Error(evt && evt.data && evt.data.message || evt.data || evt || 'Error'));
        }
        this.close();
    };
    ImapClient.prototype._destroy = function () {
        this._serverQueue = [];
        this._clientQueue = [];
        this._currentCommand = false;
        clearTimeout(this._idleTimer);
        clearTimeout(this._socketTimeoutTimer);
        if (!this.destroyed) {
            this.destroyed = true;
            this.onclose();
        }
    };
    ImapClient.prototype._onClose = function () {
        this._destroy();
    };
    ImapClient.prototype._onTimeout = function () {
        var error = new Error(this.options.sessionId + ' Socket timed out!');
        axe.error(DEBUG_TAG, error);
        this._onError(error);
    };
    ImapClient.prototype._onDrain = function () {
        this.waitDrain = false;
        this.ondrain();
    };
    ImapClient.prototype._onData = function (evt) {
        if (!evt || !evt.data) {
            return;
        }
        clearTimeout(this._socketTimeoutTimer);
        var match, str = mimefuncs.fromTypedArray(evt.data);
        if (this._literalRemaining) {
            if (this._literalRemaining > str.length) {
                this._literalRemaining -= str.length;
                this._command += str;
                return;
            }
            this._command += str.substr(0, this._literalRemaining);
            str = str.substr(this._literalRemaining);
            this._literalRemaining = 0;
        }
        this._remainder = str = this._remainder + str;
        while (match = str.match(/(\{(\d+)(\+)?\})?\r?\n/)) {
            if (!match[2]) {
                this._addToServerQueue(this._command + str.substr(0, match.index));
                this._remainder = str = str.substr(match.index + match[0].length);
                this._command = '';
                continue;
            }
            this._remainder = '';
            this._command += str.substr(0, match.index + match[0].length);
            this._literalRemaining = Number(match[2]);
            str = str.substr(match.index + match[0].length);
            if (this._literalRemaining > str.length) {
                this._command += str;
                this._literalRemaining -= str.length;
                return;
            } else {
                this._command += str.substr(0, this._literalRemaining);
                this._remainder = str = str.substr(this._literalRemaining);
                this._literalRemaining = 0;
            }
        }
    };
    ImapClient.prototype._onOpen = function () {
        axe.debug(DEBUG_TAG, this.options.sessionId + ' tcp socket opened');
        this.socket.ondata = this._onData.bind(this);
        this.socket.onclose = this._onClose.bind(this);
        this.socket.ondrain = this._onDrain.bind(this);
    };
    ImapClient.prototype._addToServerQueue = function (cmd) {
        this._serverQueue.push(cmd);
        if (this._processingServerData) {
            return;
        }
        this._processingServerData = true;
        this._processServerQueue();
    };
    ImapClient.prototype._processServerQueue = function () {
        if (!this._serverQueue.length) {
            this._processingServerData = false;
            return;
        } else {
            this._clearIdle();
        }
        var data = this._serverQueue.shift(), response;
        try {
            if (/^\+/.test(data)) {
                response = {
                    tag: '+',
                    payload: data.substr(2) || ''
                };
            } else {
                response = imapHandler.parser(data);
                axe.debug(DEBUG_TAG, this.options.sessionId + ' S: ' + imapHandler.compiler(response, false, true));
            }
        } catch (e) {
            axe.error(DEBUG_TAG, this.options.sessionId + ' error parsing imap response: ' + e + '\n' + e.stack + '\nraw:' + data);
            return this._onError(e);
        }
        if (response.tag === '*' && /^\d+$/.test(response.command) && response.attributes && response.attributes.length && response.attributes[0].type === 'ATOM') {
            response.nr = Number(response.command);
            response.command = (response.attributes.shift().value || '').toString().toUpperCase().trim();
        }
        if (response.tag === '+') {
            if (this._currentCommand.data.length) {
                data = this._currentCommand.data.shift();
                this.send(data + (!this._currentCommand.data.length ? '\r\n' : ''));
            } else if (typeof this._currentCommand.onplustagged === 'function') {
                this._currentCommand.onplustagged(response, this._processServerQueue.bind(this));
                return;
            }
            setTimeout(this._processServerQueue.bind(this), 0);
            return;
        }
        this._processServerResponse(response, function (err) {
            if (err) {
                return this._onError(err);
            }
            if (!this._connectionReady) {
                this._connectionReady = true;
                this.onready();
                this._canSend = true;
                this._sendRequest();
            } else if (response.tag !== '*') {
                this._canSend = true;
                this._sendRequest();
            }
            setTimeout(this._processServerQueue.bind(this), 0);
        }.bind(this));
    };
    ImapClient.prototype._processServerResponse = function (response, callback) {
        var command = (response && response.command || '').toUpperCase().trim();
        this._processResponse(response);
        if (!this._currentCommand) {
            if (response.tag === '*' && command in this._globalAcceptUntagged) {
                return this._globalAcceptUntagged[command](response, callback);
            } else {
                return callback();
            }
        }
        if (this._currentCommand.payload && response.tag === '*' && command in this._currentCommand.payload) {
            this._currentCommand.payload[command].push(response);
            return callback();
        } else if (response.tag === '*' && command in this._globalAcceptUntagged) {
            this._globalAcceptUntagged[command](response, callback);
        } else if (response.tag === this._currentCommand.tag) {
            if (typeof this._currentCommand.callback === 'function') {
                if (this._currentCommand.payload && Object.keys(this._currentCommand.payload).length) {
                    response.payload = this._currentCommand.payload;
                }
                return this._currentCommand.callback(response, callback);
            } else {
                return callback();
            }
        } else {
            return callback();
        }
    };
    ImapClient.prototype._addToClientQueue = function (request, acceptUntagged, options, callback) {
        var tag = 'W' + ++this._tagCounter, data;
        if (!callback && typeof options === 'function') {
            callback = options;
            options = undefined;
        }
        if (!callback && typeof acceptUntagged === 'function') {
            callback = acceptUntagged;
            acceptUntagged = undefined;
        }
        acceptUntagged = [].concat(acceptUntagged || []).map(function (untagged) {
            return (untagged || '').toString().toUpperCase().trim();
        });
        request.tag = tag;
        data = {
            tag: tag,
            request: request,
            payload: acceptUntagged.length ? {} : undefined,
            callback: callback
        };
        Object.keys(options || {}).forEach(function (key) {
            data[key] = options[key];
        });
        acceptUntagged.forEach(function (command) {
            data.payload[command] = [];
        });
        var index = data.ctx ? this._clientQueue.indexOf(data.ctx) : -1;
        if (index >= 0) {
            data.tag += '.p';
            data.request.tag += '.p';
            this._clientQueue.splice(index, 0, data);
        } else {
            this._clientQueue.push(data);
        }
        if (this._canSend) {
            this._sendRequest();
        }
    };
    ImapClient.prototype._sendRequest = function () {
        if (!this._clientQueue.length) {
            return this._enterIdle();
        }
        this._clearIdle();
        this._restartQueue = false;
        var command = this._clientQueue[0];
        if (typeof command.precheck === 'function') {
            var context = command;
            var precheck = context.precheck;
            delete context.precheck;
            this._restartQueue = true;
            precheck(context, function (err) {
                if (!err) {
                    if (this._restartQueue) {
                        this._sendRequest();
                    }
                    return;
                }
                var cmd, index = this._clientQueue.indexOf(context);
                if (index >= 0) {
                    cmd = this._clientQueue.splice(index, 1)[0];
                }
                if (cmd && cmd.callback) {
                    cmd.callback(err, function () {
                        this._canSend = true;
                        this._sendRequest();
                        setTimeout(this._processServerQueue.bind(this), 0);
                    }.bind(this));
                }
            }.bind(this));
            return;
        }
        this._canSend = false;
        this._currentCommand = this._clientQueue.shift();
        var loggedCommand = false;
        try {
            this._currentCommand.data = imapHandler.compiler(this._currentCommand.request, true);
            loggedCommand = imapHandler.compiler(this._currentCommand.request, false, true);
        } catch (e) {
            axe.error(DEBUG_TAG, this.options.sessionId + ' error compiling imap command: ' + e + '\nstack trace: ' + e.stack + '\nraw:' + this._currentCommand.request);
            return this._onError(e);
        }
        axe.debug(DEBUG_TAG, this.options.sessionId + ' C: ' + loggedCommand);
        var data = this._currentCommand.data.shift();
        this.send(data + (!this._currentCommand.data.length ? '\r\n' : ''));
        return this.waitDrain;
    };
    ImapClient.prototype._enterIdle = function () {
        clearTimeout(this._idleTimer);
        this._idleTimer = setTimeout(function () {
            this.onidle();
        }.bind(this), this.TIMEOUT_ENTER_IDLE);
    };
    ImapClient.prototype._clearIdle = function () {
        clearTimeout(this._idleTimer);
    };
    ImapClient.prototype._processResponse = function (response) {
        var command = (response && response.command || '').toString().toUpperCase().trim(), option, key;
        if ([
                'OK',
                'NO',
                'BAD',
                'BYE',
                'PREAUTH'
            ].indexOf(command) >= 0) {
            if (option = response && response.attributes && response.attributes.length && response.attributes[0].type === 'ATOM' && response.attributes[0].section && response.attributes[0].section.map(function (key) {
                    if (!key) {
                        return;
                    }
                    if (Array.isArray(key)) {
                        return key.map(function (key) {
                            return (key.value || '').toString().trim();
                        });
                    } else {
                        return (key.value || '').toString().toUpperCase().trim();
                    }
                })) {
                key = option && option.shift();
                response.code = key;
                if (option.length) {
                    option = [].concat(option || []);
                    response[key.toLowerCase()] = option.length === 1 ? option[0] : option;
                }
            }
            if (response && response.attributes && response.attributes.length && response.attributes[response.attributes.length - 1].type === 'TEXT') {
                response.humanReadable = response.attributes[response.attributes.length - 1].value;
            }
        }
    };
    ImapClient.prototype.isError = function (value) {
        return !!Object.prototype.toString.call(value).match(/Error\]$/);
    };
    return ImapClient;
}));
(function (root, factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define('browserbox', [
            'browserbox-imap',
            'utf7',
            'imap-handler',
            'mimefuncs',
            'axe'
        ], function (ImapClient, utf7, imapHandler, mimefuncs, axe) {
            return factory(ImapClient, utf7, imapHandler, mimefuncs, axe);
        });
    } else if (typeof exports === 'object') {
        module.exports = factory(require('./browserbox-imap'), require('wo-utf7'), require('wo-imap-handler'), require('mimefuncs'), require('axe-logger'));
    } else {
        root.BrowserBox = factory(root.BrowserboxImapClient, root.utf7, root.imapHandler, root.mimefuncs, root.axe);
    }
}(this, function (ImapClient, utf7, imapHandler, mimefuncs, axe) {
    'use strict';
    var DEBUG_TAG = 'browserbox';
    var SPECIAL_USE_FLAGS = [
        '\\All',
        '\\Archive',
        '\\Drafts',
        '\\Flagged',
        '\\Junk',
        '\\Sent',
        '\\Trash'
    ];
    var SPECIAL_USE_BOXES = {
        '\\Sent': [
            'aika',
            'bidaliak',
            'bidalita',
            'dihantar',
            'e rometsweng',
            'e tindami',
            'elküldött',
            'elküldöttek',
            'enviadas',
            'enviadas',
            'enviados',
            'enviats',
            'envoyés',
            'ethunyelweyo',
            'expediate',
            'ezipuru',
            'gesendete',
            'gestuur',
            'gönderilmiş öğeler',
            'göndərilənlər',
            'iberilen',
            'inviati',
            'išsiųstieji',
            'kuthunyelwe',
            'lasa',
            'lähetetyt',
            'messages envoyés',
            'naipadala',
            'nalefa',
            'napadala',
            'nosūtītās ziņas',
            'odeslané',
            'padala',
            'poslane',
            'poslano',
            'poslano',
            'poslané',
            'poslato',
            'saadetud',
            'saadetud kirjad',
            'sendt',
            'sendt',
            'sent',
            'sent items',
            'sent messages',
            'sända poster',
            'sänt',
            'terkirim',
            'ti fi ranṣẹ',
            'të dërguara',
            'verzonden',
            'vilivyotumwa',
            'wysłane',
            'đã gửi',
            'σταλθέντα',
            'жиберилген',
            'жіберілгендер',
            'изпратени',
            'илгээсэн',
            'ирсол шуд',
            'испратено',
            'надіслані',
            'отправленные',
            'пасланыя',
            'юборилган',
            'ուղարկված',
            'נשלחו',
            'פריטים שנשלחו',
            'المرسلة',
            'بھیجے گئے',
            'سوزمژہ',
            'لېګل شوی',
            'موارد ارسال شده',
            'पाठविले',
            'पाठविलेले',
            'प्रेषित',
            'भेजा गया',
            'প্রেরিত',
            'প্রেরিত',
            'প্ৰেৰিত',
            'ਭੇਜੇ',
            'મોકલેલા',
            'ପଠାଗଲା',
            'அனுப்பியவை',
            'పంపించబడింది',
            'ಕಳುಹಿಸಲಾದ',
            'അയച്ചു',
            'යැවු පණිවුඩ',
            'ส่งแล้ว',
            'გაგზავნილი',
            'የተላኩ',
            'បាន\u200Bផ្ញើ',
            '寄件備份',
            '寄件備份',
            '已发信息',
            '送信済みﾒｰﾙ',
            '발신 메시지',
            '보낸 편지함'
        ],
        '\\Trash': [
            'articole șterse',
            'bin',
            'borttagna objekt',
            'deleted',
            'deleted items',
            'deleted messages',
            'elementi eliminati',
            'elementos borrados',
            'elementos eliminados',
            'gelöschte objekte',
            'item dipadam',
            'itens apagados',
            'itens excluídos',
            'mục đã xóa',
            'odstraněné položky',
            'pesan terhapus',
            'poistetut',
            'praht',
            'prügikast',
            'silinmiş öğeler',
            'slettede beskeder',
            'slettede elementer',
            'trash',
            'törölt elemek',
            'usunięte wiadomości',
            'verwijderde items',
            'vymazané správy',
            'éléments supprimés',
            'видалені',
            'жойылғандар',
            'удаленные',
            'פריטים שנמחקו',
            'العناصر المحذوفة',
            'موارد حذف شده',
            'รายการที่ลบ',
            '已删除邮件',
            '已刪除項目',
            '已刪除項目'
        ],
        '\\Junk': [
            'bulk mail',
            'correo no deseado',
            'courrier indésirable',
            'istenmeyen',
            'istenmeyen e-posta',
            'junk',
            'levélszemét',
            'nevyžiadaná pošta',
            'nevyžádaná pošta',
            'no deseado',
            'posta indesiderata',
            'pourriel',
            'roskaposti',
            'skräppost',
            'spam',
            'spam',
            'spamowanie',
            'søppelpost',
            'thư rác',
            'спам',
            'דואר זבל',
            'الرسائل العشوائية',
            'هرزنامه',
            'สแปม',
            '\u200E垃圾郵件',
            '垃圾邮件',
            '垃圾電郵'
        ],
        '\\Drafts': [
            'ba brouillon',
            'borrador',
            'borrador',
            'borradores',
            'bozze',
            'brouillons',
            'bản thảo',
            'ciorne',
            'concepten',
            'draf',
            'drafts',
            'drög',
            'entwürfe',
            'esborranys',
            'garalamalar',
            'ihe edeturu',
            'iidrafti',
            'izinhlaka',
            'juodraščiai',
            'kladd',
            'kladder',
            'koncepty',
            'koncepty',
            'konsep',
            'konsepte',
            'kopie robocze',
            'layihələr',
            'luonnokset',
            'melnraksti',
            'meralo',
            'mesazhe të padërguara',
            'mga draft',
            'mustandid',
            'nacrti',
            'nacrti',
            'osnutki',
            'piszkozatok',
            'rascunhos',
            'rasimu',
            'skice',
            'taslaklar',
            'tsararrun saƙonni',
            'utkast',
            'vakiraoka',
            'vázlatok',
            'zirriborroak',
            'àwọn àkọpamọ́',
            'πρόχειρα',
            'жобалар',
            'нацрти',
            'нооргууд',
            'сиёҳнавис',
            'хомаки хатлар',
            'чарнавікі',
            'чернетки',
            'чернови',
            'черновики',
            'черновиктер',
            'սևագրեր',
            'טיוטות',
            'مسودات',
            'مسودات',
            'موسودې',
            'پیش نویسها',
            'ڈرافٹ/',
            'ड्राफ़्ट',
            'प्रारूप',
            'খসড়া',
            'খসড়া',
            'ড্ৰাফ্ট',
            'ਡ੍ਰਾਫਟ',
            'ડ્રાફ્ટસ',
            'ଡ୍ରାଫ୍ଟ',
            'வரைவுகள்',
            'చిత్తు ప్రతులు',
            'ಕರಡುಗಳು',
            'കരടുകള്‍',
            'කෙටුම් පත්',
            'ฉบับร่าง',
            'მონახაზები',
            'ረቂቆች',
            'សារព្រាង',
            '下書き',
            '草稿',
            '草稿',
            '草稿',
            '임시 보관함'
        ]
    };
    var SPECIAL_USE_BOX_FLAGS = Object.keys(SPECIAL_USE_BOXES);
    var SESSIONCOUNTER = 0;
    function BrowserBox(host, port, options) {
        this.options = options || {};
        this.options.sessionId = this.options.sessionId || '[' + ++SESSIONCOUNTER + ']';
        this.capability = [];
        this.serverId = false;
        this.state = false;
        this.authenticated = false;
        this.selectedMailbox = false;
        this.client = new ImapClient(host, port, this.options);
        this._enteredIdle = false;
        this._idleTimeout = false;
        this._init();
    }
    BrowserBox.prototype.STATE_CONNECTING = 1;
    BrowserBox.prototype.STATE_NOT_AUTHENTICATED = 2;
    BrowserBox.prototype.STATE_AUTHENTICATED = 3;
    BrowserBox.prototype.STATE_SELECTED = 4;
    BrowserBox.prototype.STATE_LOGOUT = 5;
    BrowserBox.prototype.TIMEOUT_CONNECTION = 90 * 1000;
    BrowserBox.prototype.TIMEOUT_NOOP = 60 * 1000;
    BrowserBox.prototype.TIMEOUT_IDLE = 60 * 1000;
    BrowserBox.prototype._init = function () {
        this.client.onerror = function (err) {
            this.onerror(err);
        }.bind(this);
        this.client.oncert = function (cert) {
            this.oncert(cert);
        }.bind(this);
        this.client.onclose = function () {
            clearTimeout(this._connectionTimeout);
            clearTimeout(this._idleTimeout);
            this.onclose();
        }.bind(this);
        this.client.onready = this._onReady.bind(this);
        this.client.onidle = this._onIdle.bind(this);
        this.client.setHandler('capability', this._untaggedCapabilityHandler.bind(this));
        this.client.setHandler('ok', this._untaggedOkHandler.bind(this));
        this.client.setHandler('exists', this._untaggedExistsHandler.bind(this));
        this.client.setHandler('expunge', this._untaggedExpungeHandler.bind(this));
        this.client.setHandler('fetch', this._untaggedFetchHandler.bind(this));
    };
    BrowserBox.prototype.onclose = function () {
    };
    BrowserBox.prototype.onauth = function () {
    };
    BrowserBox.prototype.onupdate = function () {
    };
    BrowserBox.prototype.oncert = function () {
    };
    BrowserBox.prototype.onselectmailbox = function () {
    };
    BrowserBox.prototype.onclosemailbox = function () {
    };
    BrowserBox.prototype._onClose = function () {
        axe.debug(DEBUG_TAG, this.options.sessionId + ' connection closed. goodbye.');
        this.onclose();
    };
    BrowserBox.prototype._onTimeout = function () {
        clearTimeout(this._connectionTimeout);
        var error = new Error(this.options.sessionId + ' Timeout creating connection to the IMAP server');
        axe.error(DEBUG_TAG, error);
        this.onerror(error);
        this.client._destroy();
    };
    BrowserBox.prototype._onReady = function () {
        clearTimeout(this._connectionTimeout);
        axe.debug(DEBUG_TAG, this.options.sessionId + ' session: connection established');
        this._changeState(this.STATE_NOT_AUTHENTICATED);
        this.updateCapability(function () {
            this.upgradeConnection(function (err) {
                if (err) {
                    this.onerror(err);
                    this.close();
                    return;
                }
                this.updateId(this.options.id, function () {
                    this.login(this.options.auth, function (err) {
                        if (err) {
                            this.onerror(err);
                            this.close();
                            return;
                        }
                        this.onauth();
                    }.bind(this));
                }.bind(this));
            }.bind(this));
        }.bind(this));
    };
    BrowserBox.prototype._onIdle = function () {
        if (!this.authenticated || this._enteredIdle) {
            return;
        }
        axe.debug(DEBUG_TAG, this.options.sessionId + ' client: started idling');
        this.enterIdle();
    };
    BrowserBox.prototype.connect = function () {
        axe.debug(DEBUG_TAG, this.options.sessionId + ' connecting to ' + this.client.host + ':' + this.client.port);
        this._changeState(this.STATE_CONNECTING);
        clearTimeout(this._connectionTimeout);
        this._connectionTimeout = setTimeout(this._onTimeout.bind(this), this.TIMEOUT_CONNECTION);
        this.client.connect();
    };
    BrowserBox.prototype.close = function (callback) {
        var promise;
        if (!callback) {
            promise = new Promise(function (resolve, reject) {
                callback = callbackPromise(resolve, reject);
            });
        }
        axe.debug(DEBUG_TAG, this.options.sessionId + ' closing connection');
        this._changeState(this.STATE_LOGOUT);
        this.exec('LOGOUT', function (err) {
            if (typeof callback === 'function') {
                callback(err || null);
            }
            this.client.close();
        }.bind(this));
        return promise;
    };
    BrowserBox.prototype.exec = function () {
        var args = Array.prototype.slice.call(arguments), callback = args.pop();
        if (typeof callback !== 'function') {
            args.push(callback);
            callback = undefined;
        }
        args.push(function (response, next) {
            var error = null;
            if (response && response.capability) {
                this.capability = response.capability;
            }
            if (this.client.isError(response)) {
                error = response;
            } else if ([
                    'NO',
                    'BAD'
                ].indexOf((response && response.command || '').toString().toUpperCase().trim()) >= 0) {
                error = new Error(response.humanReadable || 'Error');
                if (response.code) {
                    error.code = response.code;
                }
            }
            if (typeof callback === 'function') {
                callback(error, response, next);
            } else {
                next();
            }
        }.bind(this));
        this.breakIdle(function () {
            this.client.exec.apply(this.client, args);
        }.bind(this));
    };
    BrowserBox.prototype.enterIdle = function () {
        if (this._enteredIdle) {
            return;
        }
        this._enteredIdle = this.capability.indexOf('IDLE') >= 0 ? 'IDLE' : 'NOOP';
        axe.debug(DEBUG_TAG, this.options.sessionId + ' entering idle with ' + this._enteredIdle);
        if (this._enteredIdle === 'NOOP') {
            this._idleTimeout = setTimeout(function () {
                this.exec('NOOP');
            }.bind(this), this.TIMEOUT_NOOP);
        } else if (this._enteredIdle === 'IDLE') {
            this.client.exec({ command: 'IDLE' }, function (response, next) {
                next();
            }.bind(this));
            this._idleTimeout = setTimeout(function () {
                axe.debug(DEBUG_TAG, this.options.sessionId + ' sending idle DONE');
                this.client.send('DONE\r\n');
                this._enteredIdle = false;
            }.bind(this), this.TIMEOUT_IDLE);
        }
    };
    BrowserBox.prototype.breakIdle = function (callback) {
        if (!this._enteredIdle) {
            return callback();
        }
        clearTimeout(this._idleTimeout);
        if (this._enteredIdle === 'IDLE') {
            axe.debug(DEBUG_TAG, this.options.sessionId + ' sending idle DONE');
            this.client.send('DONE\r\n');
        }
        this._enteredIdle = false;
        axe.debug(DEBUG_TAG, this.options.sessionId + ' idle terminated');
        return callback();
    };
    BrowserBox.prototype.upgradeConnection = function (callback) {
        if (this.client.secureMode) {
            return callback(null, false);
        }
        if ((this.capability.indexOf('STARTTLS') < 0 || this.options.ignoreTLS) && !this.options.requireTLS) {
            return callback(null, false);
        }
        this.exec('STARTTLS', function (err, response, next) {
            if (err) {
                callback(err);
                next();
            } else {
                this.capability = [];
                this.client.upgrade(function (err, upgraded) {
                    this.updateCapability(function () {
                        callback(err, upgraded);
                    });
                    next();
                }.bind(this));
            }
        }.bind(this));
    };
    BrowserBox.prototype.updateCapability = function (forced, callback) {
        if (!callback && typeof forced === 'function') {
            callback = forced;
            forced = undefined;
        }
        if (!forced && this.capability.length) {
            return callback(null, false);
        }
        if (!this.client.secureMode && this.options.requireTLS) {
            return callback(null, false);
        }
        this.exec('CAPABILITY', function (err, response, next) {
            if (err) {
                callback(err);
            } else {
                callback(null, true);
            }
            next();
        });
    };
    BrowserBox.prototype.listNamespaces = function (callback) {
        var promise;
        if (!callback) {
            promise = new Promise(function (resolve, reject) {
                callback = callbackPromise(resolve, reject);
            });
        }
        if (this.capability.indexOf('NAMESPACE') < 0) {
            setTimeout(function () {
                callback(null, false);
            }, 0);
            return promise;
        }
        this.exec('NAMESPACE', 'NAMESPACE', function (err, response, next) {
            if (err) {
                callback(err);
            } else {
                callback(null, this._parseNAMESPACE(response));
            }
            next();
        }.bind(this));
        return promise;
    };
    BrowserBox.prototype.login = function (auth, callback) {
        var command, options = {};
        if (!auth) {
            return callback(new Error('Authentication information not provided'));
        }
        if (this.capability.indexOf('AUTH=XOAUTH2') >= 0 && auth && auth.xoauth2) {
            command = {
                command: 'AUTHENTICATE',
                attributes: [
                    {
                        type: 'ATOM',
                        value: 'XOAUTH2'
                    },
                    {
                        type: 'ATOM',
                        value: this._buildXOAuth2Token(auth.user, auth.xoauth2),
                        sensitive: true
                    }
                ]
            };
            options.onplustagged = function (response, next) {
                var payload;
                if (response && response.payload) {
                    try {
                        payload = JSON.parse(mimefuncs.base64Decode(response.payload));
                    } catch (e) {
                        axe.error(DEBUG_TAG, this.options.sessionId + ' error parsing XOAUTH2 payload: ' + e + '\nstack trace: ' + e.stack);
                    }
                }
                this.client.send('\r\n');
                next();
            }.bind(this);
        } else {
            command = {
                command: 'login',
                attributes: [
                    {
                        type: 'STRING',
                        value: auth.user || ''
                    },
                    {
                        type: 'STRING',
                        value: auth.pass || '',
                        sensitive: true
                    }
                ]
            };
        }
        this.exec(command, 'capability', options, function (err, response, next) {
            var capabilityUpdated = false;
            if (err) {
                callback(err);
                return next();
            }
            this._changeState(this.STATE_AUTHENTICATED);
            this.authenticated = true;
            if (response.capability && response.capability.length) {
                this.capability = [].concat(response.capability || []);
                capabilityUpdated = true;
                axe.debug(DEBUG_TAG, this.options.sessionId + ' post-auth capabilites updated: ' + this.capability);
                callback(null, true);
            } else if (response.payload && response.payload.CAPABILITY && response.payload.CAPABILITY.length) {
                this.capability = [].concat(response.payload.CAPABILITY.pop().attributes || []).map(function (capa) {
                    return (capa.value || '').toString().toUpperCase().trim();
                });
                capabilityUpdated = true;
                axe.debug(DEBUG_TAG, this.options.sessionId + ' post-auth capabilites updated: ' + this.capability);
                callback(null, true);
            } else {
                this.updateCapability(true, function (err) {
                    if (err) {
                        callback(err);
                    } else {
                        axe.debug(DEBUG_TAG, this.options.sessionId + ' post-auth capabilites updated: ' + this.capability);
                        callback(null, true);
                    }
                }.bind(this));
            }
            next();
        }.bind(this));
    };
    BrowserBox.prototype.updateId = function (id, callback) {
        if (this.capability.indexOf('ID') < 0) {
            return callback(null, false);
        }
        var attributes = [[]];
        if (id) {
            if (typeof id === 'string') {
                id = { name: id };
            }
            Object.keys(id).forEach(function (key) {
                attributes[0].push(key);
                attributes[0].push(id[key]);
            });
        } else {
            attributes[0] = null;
        }
        this.exec({
            command: 'ID',
            attributes: attributes
        }, 'ID', function (err, response, next) {
            if (err) {
                axe.error(DEBUG_TAG, this.options.sessionId + ' error updating server id: ' + err + '\n' + err.stack);
                callback(err);
                return next();
            }
            if (!response.payload || !response.payload.ID || !response.payload.ID.length) {
                callback(null, false);
                return next();
            }
            this.serverId = {};
            var key;
            [].concat([].concat(response.payload.ID.shift().attributes || []).shift() || []).forEach(function (val, i) {
                if (i % 2 === 0) {
                    key = (val && val.value || '').toString().toLowerCase().trim();
                } else {
                    this.serverId[key] = (val && val.value || '').toString();
                }
            }.bind(this));
            callback(null, this.serverId);
            next();
        }.bind(this));
    };
    BrowserBox.prototype.listMailboxes = function (callback) {
        var promise;
        if (!callback) {
            promise = new Promise(function (resolve, reject) {
                callback = callbackPromise(resolve, reject);
            });
        }
        this.exec({
            command: 'LIST',
            attributes: [
                '',
                '*'
            ]
        }, 'LIST', function (err, response, next) {
            if (err) {
                callback(err);
                return next();
            }
            var tree = {
                root: true,
                children: []
            };
            if (!response.payload || !response.payload.LIST || !response.payload.LIST.length) {
                callback(null, false);
                return next();
            }
            response.payload.LIST.forEach(function (item) {
                if (!item || !item.attributes || item.attributes.length < 3) {
                    return;
                }
                var branch = this._ensurePath(tree, (item.attributes[2].value || '').toString(), (item.attributes[1] ? item.attributes[1].value : '/').toString());
                branch.flags = [].concat(item.attributes[0] || []).map(function (flag) {
                    return (flag.value || '').toString();
                });
                branch.listed = true;
                this._checkSpecialUse(branch);
            }.bind(this));
            this.exec({
                command: 'LSUB',
                attributes: [
                    '',
                    '*'
                ]
            }, 'LSUB', function (err, response, next) {
                if (err) {
                    axe.error(DEBUG_TAG, this.options.sessionId + ' error while listing subscribed mailboxes: ' + err + '\n' + err.stack);
                    callback(null, tree);
                    return next();
                }
                if (!response.payload || !response.payload.LSUB || !response.payload.LSUB.length) {
                    callback(null, tree);
                    return next();
                }
                response.payload.LSUB.forEach(function (item) {
                    if (!item || !item.attributes || item.attributes.length < 3) {
                        return;
                    }
                    var branch = this._ensurePath(tree, (item.attributes[2].value || '').toString(), (item.attributes[1] ? item.attributes[1].value : '/').toString());
                    [].concat(item.attributes[0] || []).map(function (flag) {
                        flag = (flag.value || '').toString();
                        if (!branch.flags || branch.flags.indexOf(flag) < 0) {
                            branch.flags = [].concat(branch.flags || []).concat(flag);
                        }
                    });
                    branch.subscribed = true;
                }.bind(this));
                callback(null, tree);
                next();
            }.bind(this));
            next();
        }.bind(this));
        return promise;
    };
    BrowserBox.prototype.createMailbox = function (path, callback) {
        var promise;
        if (!callback) {
            promise = new Promise(function (resolve, reject) {
                callback = callbackPromise(resolve, reject);
            });
        }
        this.exec({
            command: 'CREATE',
            attributes: [utf7.imap.encode(path)]
        }, function (err, response, next) {
            if (err && err.code === 'ALREADYEXISTS') {
                callback(null, true);
            } else {
                callback(err, false);
            }
            next();
        });
        return promise;
    };
    BrowserBox.prototype.listMessages = function (sequence, items, options, callback) {
        var promise;
        if (!callback && typeof options === 'function') {
            callback = options;
            options = undefined;
        }
        if (!callback && typeof items === 'function') {
            callback = items;
            items = undefined;
        }
        if (!callback) {
            promise = new Promise(function (resolve, reject) {
                callback = callbackPromise(resolve, reject);
            });
        }
        items = items || { fast: true };
        options = options || {};
        var command = this._buildFETCHCommand(sequence, items, options);
        this.exec(command, 'FETCH', {
            precheck: options.precheck,
            ctx: options.ctx
        }, function (err, response, next) {
            if (err) {
                callback(err);
            } else {
                callback(null, this._parseFETCH(response));
            }
            next();
        }.bind(this));
        return promise;
    };
    BrowserBox.prototype.search = function (query, options, callback) {
        var promise;
        if (!callback && typeof options === 'function') {
            callback = options;
            options = undefined;
        }
        if (!callback) {
            promise = new Promise(function (resolve, reject) {
                callback = callbackPromise(resolve, reject);
            });
        }
        options = options || {};
        var command = this._buildSEARCHCommand(query, options);
        this.exec(command, 'SEARCH', {
            precheck: options.precheck,
            ctx: options.ctx
        }, function (err, response, next) {
            if (err) {
                callback(err);
            } else {
                callback(null, this._parseSEARCH(response));
            }
            next();
        }.bind(this));
        return promise;
    };
    BrowserBox.prototype.setFlags = function (sequence, flags, options, callback) {
        var promise;
        if (!callback && typeof options === 'function') {
            callback = options;
            options = undefined;
        }
        if (!callback) {
            promise = new Promise(function (resolve, reject) {
                callback = callbackPromise(resolve, reject);
            });
        }
        options = options || {};
        var command = this._buildSTORECommand(sequence, flags, options);
        this.exec(command, 'FETCH', {
            precheck: options.precheck,
            ctx: options.ctx
        }, function (err, response, next) {
            if (err) {
                callback(err);
            } else {
                callback(null, this._parseFETCH(response));
            }
            next();
        }.bind(this));
        return promise;
    };
    BrowserBox.prototype.upload = function (destination, message, options, callback) {
        var promise;
        if (!callback && typeof options === 'function') {
            callback = options;
            options = undefined;
        }
        if (!callback) {
            promise = new Promise(function (resolve, reject) {
                callback = callbackPromise(resolve, reject);
            });
        }
        options = options || {};
        options.flags = options.flags || ['\\Seen'];
        var flags = options.flags.map(function (flag) {
            return {
                type: 'atom',
                value: flag
            };
        });
        var command = { command: 'APPEND' };
        command.attributes = [
            {
                type: 'atom',
                value: destination
            },
            flags,
            {
                type: 'literal',
                value: message
            }
        ];
        this.exec(command, {
            precheck: options.precheck,
            ctx: options.ctx
        }, function (err, response, next) {
            callback(err, err ? undefined : true);
            next();
        }.bind(this));
        return promise;
    };
    BrowserBox.prototype.deleteMessages = function (sequence, options, callback) {
        var promise;
        if (!callback && typeof options === 'function') {
            callback = options;
            options = undefined;
        }
        if (!callback) {
            promise = new Promise(function (resolve, reject) {
                callback = callbackPromise(resolve, reject);
            });
        }
        options = options || {};
        this.setFlags(sequence, { add: '\\Deleted' }, options, function (err) {
            if (err) {
                return callback(err);
            }
            this.exec(options.byUid && this.capability.indexOf('UIDPLUS') >= 0 ? {
                command: 'UID EXPUNGE',
                attributes: [{
                        type: 'sequence',
                        value: sequence
                    }]
            } : 'EXPUNGE', function (err, response, next) {
                if (err) {
                    callback(err);
                } else {
                    callback(null, true);
                }
                next();
            }.bind(this));
        }.bind(this));
        return promise;
    };
    BrowserBox.prototype.copyMessages = function (sequence, destination, options, callback) {
        var promise;
        if (!callback && typeof options === 'function') {
            callback = options;
            options = undefined;
        }
        if (!callback) {
            promise = new Promise(function (resolve, reject) {
                callback = callbackPromise(resolve, reject);
            });
        }
        options = options || {};
        this.exec({
            command: options.byUid ? 'UID COPY' : 'COPY',
            attributes: [
                {
                    type: 'sequence',
                    value: sequence
                },
                {
                    type: 'atom',
                    value: destination
                }
            ]
        }, {
            precheck: options.precheck,
            ctx: options.ctx
        }, function (err, response, next) {
            if (err) {
                callback(err);
            } else {
                callback(null, response.humanReadable || 'COPY completed');
            }
            next();
        }.bind(this));
        return promise;
    };
    BrowserBox.prototype.moveMessages = function (sequence, destination, options, callback) {
        var promise;
        if (!callback && typeof options === 'function') {
            callback = options;
            options = undefined;
        }
        if (!callback) {
            promise = new Promise(function (resolve, reject) {
                callback = callbackPromise(resolve, reject);
            });
        }
        options = options || {};
        if (this.capability.indexOf('MOVE') >= 0) {
            this.exec({
                command: options.byUid ? 'UID MOVE' : 'MOVE',
                attributes: [
                    {
                        type: 'sequence',
                        value: sequence
                    },
                    {
                        type: 'atom',
                        value: destination
                    }
                ]
            }, ['OK'], {
                precheck: options.precheck,
                ctx: options.ctx
            }, function (err, response, next) {
                if (err) {
                    callback(err);
                } else {
                    callback(null, true);
                }
                next();
            }.bind(this));
        } else {
            this.copyMessages(sequence, destination, options, function (err) {
                if (err) {
                    return callback(err);
                }
                delete options.precheck;
                this.deleteMessages(sequence, options, callback);
            }.bind(this));
        }
        return promise;
    };
    BrowserBox.prototype.selectMailbox = function (path, options, callback) {
        var promise;
        if (!callback && typeof options === 'function') {
            callback = options;
            options = undefined;
        }
        if (!callback) {
            promise = new Promise(function (resolve, reject) {
                callback = callbackPromise(resolve, reject);
            });
        }
        options = options || {};
        var query = {
            command: options.readOnly ? 'EXAMINE' : 'SELECT',
            attributes: [{
                    type: 'STRING',
                    value: path
                }]
        };
        if (options.condstore && this.capability.indexOf('CONDSTORE') >= 0) {
            query.attributes.push([{
                    type: 'ATOM',
                    value: 'CONDSTORE'
                }]);
        }
        this.exec(query, [
            'EXISTS',
            'FLAGS',
            'OK'
        ], {
            precheck: options.precheck,
            ctx: options.ctx
        }, function (err, response, next) {
            if (err) {
                callback(err);
                return next();
            }
            this._changeState(this.STATE_SELECTED);
            if (this.selectedMailbox && this.selectedMailbox !== path) {
                this.onclosemailbox(this.selectedMailbox);
            }
            this.selectedMailbox = path;
            var mailboxInfo = this._parseSELECT(response);
            callback(null, mailboxInfo);
            this.onselectmailbox(path, mailboxInfo);
            next();
        }.bind(this));
        return promise;
    };
    BrowserBox.prototype.hasCapability = function (capa) {
        return this.capability.indexOf((capa || '').toString().toUpperCase().trim()) >= 0;
    };
    BrowserBox.prototype._untaggedOkHandler = function (response, next) {
        if (response && response.capability) {
            this.capability = response.capability;
        }
        next();
    };
    BrowserBox.prototype._untaggedCapabilityHandler = function (response, next) {
        this.capability = [].concat(response && response.attributes || []).map(function (capa) {
            return (capa.value || '').toString().toUpperCase().trim();
        });
        next();
    };
    BrowserBox.prototype._untaggedExistsHandler = function (response, next) {
        if (response && response.hasOwnProperty('nr')) {
            this.onupdate('exists', response.nr);
        }
        next();
    };
    BrowserBox.prototype._untaggedExpungeHandler = function (response, next) {
        if (response && response.hasOwnProperty('nr')) {
            this.onupdate('expunge', response.nr);
        }
        next();
    };
    BrowserBox.prototype._untaggedFetchHandler = function (response, next) {
        this.onupdate('fetch', [].concat(this._parseFETCH({ payload: { FETCH: [response] } }) || []).shift());
        next();
    };
    BrowserBox.prototype._parseSELECT = function (response) {
        if (!response || !response.payload) {
            return;
        }
        var mailbox = { readOnly: response.code === 'READ-ONLY' }, existsResponse = response.payload.EXISTS && response.payload.EXISTS.pop(), flagsResponse = response.payload.FLAGS && response.payload.FLAGS.pop(), okResponse = response.payload.OK;
        if (existsResponse) {
            mailbox.exists = existsResponse.nr || 0;
        }
        if (flagsResponse && flagsResponse.attributes && flagsResponse.attributes.length) {
            mailbox.flags = flagsResponse.attributes[0].map(function (flag) {
                return (flag.value || '').toString().trim();
            });
        }
        [].concat(okResponse || []).forEach(function (ok) {
            switch (ok && ok.code) {
            case 'PERMANENTFLAGS':
                mailbox.permanentFlags = [].concat(ok.permanentflags || []);
                break;
            case 'UIDVALIDITY':
                mailbox.uidValidity = Number(ok.uidvalidity) || 0;
                break;
            case 'UIDNEXT':
                mailbox.uidNext = Number(ok.uidnext) || 0;
                break;
            case 'HIGHESTMODSEQ':
                mailbox.highestModseq = ok.highestmodseq || '0';
                break;
            }
        });
        return mailbox;
    };
    BrowserBox.prototype._parseNAMESPACE = function (response) {
        var attributes, namespaces = false, parseNsElement = function (arr) {
                return !arr ? false : [].concat(arr || []).map(function (ns) {
                    return !ns || !ns.length ? false : {
                        prefix: ns[0].value,
                        delimiter: ns[1] && ns[1].value
                    };
                });
            };
        if (response.payload && response.payload.NAMESPACE && response.payload.NAMESPACE.length && (attributes = [].concat(response.payload.NAMESPACE.pop().attributes || [])).length) {
            namespaces = {
                personal: parseNsElement(attributes[0]),
                users: parseNsElement(attributes[1]),
                shared: parseNsElement(attributes[2])
            };
        }
        return namespaces;
    };
    BrowserBox.prototype._buildFETCHCommand = function (sequence, items, options) {
        var command = {
                command: options.byUid ? 'UID FETCH' : 'FETCH',
                attributes: [{
                        type: 'SEQUENCE',
                        value: sequence
                    }]
            }, query = [];
        [].concat(items || []).forEach(function (item) {
            var cmd;
            item = (item || '').toString().toUpperCase().trim();
            if (/^\w+$/.test(item)) {
                query.push({
                    type: 'ATOM',
                    value: item
                });
            } else if (item) {
                try {
                    cmd = imapHandler.parser('* Z ' + item);
                    query = query.concat(cmd.attributes || []);
                } catch (E) {
                    query.push({
                        type: 'ATOM',
                        value: item
                    });
                }
            }
        });
        if (query.length === 1) {
            query = query.pop();
        }
        command.attributes.push(query);
        if (options.changedSince) {
            command.attributes.push([
                {
                    type: 'ATOM',
                    value: 'CHANGEDSINCE'
                },
                {
                    type: 'ATOM',
                    value: options.changedSince
                }
            ]);
        }
        return command;
    };
    BrowserBox.prototype._parseFETCH = function (response) {
        var list;
        if (!response || !response.payload || !response.payload.FETCH || !response.payload.FETCH.length) {
            return [];
        }
        list = [].concat(response.payload.FETCH || []).map(function (item) {
            var params = [].concat([].concat(item.attributes || [])[0] || []), message = { '#': item.nr }, i, len, key;
            for (i = 0, len = params.length; i < len; i++) {
                if (i % 2 === 0) {
                    key = imapHandler.compiler({ attributes: [params[i]] }).toLowerCase().replace(/<\d+>$/, '');
                    continue;
                }
                message[key] = this._parseFetchValue(key, params[i]);
            }
            return message;
        }.bind(this));
        return list;
    };
    BrowserBox.prototype._parseFetchValue = function (key, value) {
        if (!value) {
            return null;
        }
        if (!Array.isArray(value)) {
            switch (key) {
            case 'uid':
            case 'rfc822.size':
                return Number(value.value) || 0;
            case 'modseq':
                return value.value || '0';
            }
            return value.value;
        }
        switch (key) {
        case 'flags':
            value = [].concat(value).map(function (flag) {
                return flag.value || '';
            });
            break;
        case 'envelope':
            value = this._parseENVELOPE([].concat(value || []));
            break;
        case 'bodystructure':
            value = this._parseBODYSTRUCTURE([].concat(value || []));
            break;
        case 'modseq':
            value = (value.shift() || {}).value || '0';
            break;
        }
        return value;
    };
    BrowserBox.prototype._parseENVELOPE = function (value) {
        var processAddresses = function (list) {
                return [].concat(list || []).map(function (addr) {
                    return {
                        name: mimefuncs.mimeWordsDecode(addr[0] && addr[0].value || ''),
                        address: (addr[2] && addr[2].value || '') + '@' + (addr[3] && addr[3].value || '')
                    };
                });
            }, envelope = {};
        if (value[0] && value[0].value) {
            envelope.date = value[0].value;
        }
        if (value[1] && value[1].value) {
            envelope.subject = mimefuncs.mimeWordsDecode(value[1] && value[1].value);
        }
        if (value[2] && value[2].length) {
            envelope.from = processAddresses(value[2]);
        }
        if (value[3] && value[3].length) {
            envelope.sender = processAddresses(value[3]);
        }
        if (value[4] && value[4].length) {
            envelope['reply-to'] = processAddresses(value[4]);
        }
        if (value[5] && value[5].length) {
            envelope.to = processAddresses(value[5]);
        }
        if (value[6] && value[6].length) {
            envelope.cc = processAddresses(value[6]);
        }
        if (value[7] && value[7].length) {
            envelope.bcc = processAddresses(value[7]);
        }
        if (value[8] && value[8].value) {
            envelope['in-reply-to'] = value[8].value;
        }
        if (value[9] && value[9].value) {
            envelope['message-id'] = value[9].value;
        }
        return envelope;
    };
    BrowserBox.prototype._parseBODYSTRUCTURE = function (value) {
        var that = this;
        var processNode = function (node, path) {
            path = path || [];
            var curNode = {}, i = 0, key, part = 0;
            if (path.length) {
                curNode.part = path.join('.');
            }
            if (Array.isArray(node[0])) {
                curNode.childNodes = [];
                while (Array.isArray(node[i])) {
                    curNode.childNodes.push(processNode(node[i], path.concat(++part)));
                    i++;
                }
                curNode.type = 'multipart/' + ((node[i++] || {}).value || '').toString().toLowerCase();
                if (i < node.length - 1) {
                    if (node[i]) {
                        curNode.parameters = {};
                        [].concat(node[i] || []).forEach(function (val, j) {
                            if (j % 2) {
                                curNode.parameters[key] = mimefuncs.mimeWordsDecode((val && val.value || '').toString());
                            } else {
                                key = (val && val.value || '').toString().toLowerCase();
                            }
                        });
                    }
                    i++;
                }
            } else {
                curNode.type = [
                    ((node[i++] || {}).value || '').toString().toLowerCase(),
                    ((node[i++] || {}).value || '').toString().toLowerCase()
                ].join('/');
                if (node[i]) {
                    curNode.parameters = {};
                    [].concat(node[i] || []).forEach(function (val, j) {
                        if (j % 2) {
                            curNode.parameters[key] = mimefuncs.mimeWordsDecode((val && val.value || '').toString());
                        } else {
                            key = (val && val.value || '').toString().toLowerCase();
                        }
                    });
                }
                i++;
                if (node[i]) {
                    curNode.id = ((node[i] || {}).value || '').toString();
                }
                i++;
                if (node[i]) {
                    curNode.description = ((node[i] || {}).value || '').toString();
                }
                i++;
                if (node[i]) {
                    curNode.encoding = ((node[i] || {}).value || '').toString().toLowerCase();
                }
                i++;
                if (node[i]) {
                    curNode.size = Number((node[i] || {}).value || 0) || 0;
                }
                i++;
                if (curNode.type === 'message/rfc822') {
                    if (node[i]) {
                        curNode.envelope = that._parseENVELOPE([].concat(node[i] || []));
                    }
                    i++;
                    if (node[i]) {
                        curNode.childNodes = [processNode(node[i], path)];
                    }
                    i++;
                    if (node[i]) {
                        curNode.lineCount = Number((node[i] || {}).value || 0) || 0;
                    }
                    i++;
                } else if (/^text\//.test(curNode.type)) {
                    if (node[i]) {
                        curNode.lineCount = Number((node[i] || {}).value || 0) || 0;
                    }
                    i++;
                }
                if (i < node.length - 1) {
                    if (node[i]) {
                        curNode.md5 = ((node[i] || {}).value || '').toString().toLowerCase();
                    }
                    i++;
                }
            }
            if (i < node.length - 1) {
                if (Array.isArray(node[i]) && node[i].length) {
                    curNode.disposition = ((node[i][0] || {}).value || '').toString().toLowerCase();
                    if (Array.isArray(node[i][1])) {
                        curNode.dispositionParameters = {};
                        [].concat(node[i][1] || []).forEach(function (val, j) {
                            if (j % 2) {
                                curNode.dispositionParameters[key] = mimefuncs.mimeWordsDecode((val && val.value || '').toString());
                            } else {
                                key = (val && val.value || '').toString().toLowerCase();
                            }
                        });
                    }
                }
                i++;
            }
            if (i < node.length - 1) {
                if (node[i]) {
                    curNode.language = [].concat(node[i] || []).map(function (val) {
                        return (val && val.value || '').toString().toLowerCase();
                    });
                }
                i++;
            }
            if (i < node.length - 1) {
                if (node[i]) {
                    curNode.location = ((node[i] || {}).value || '').toString();
                }
                i++;
            }
            return curNode;
        };
        return processNode(value);
    };
    BrowserBox.prototype._buildSEARCHCommand = function (query, options) {
        var command = { command: options.byUid ? 'UID SEARCH' : 'SEARCH' };
        var isAscii = true;
        var buildTerm = function (query) {
            var list = [];
            Object.keys(query).forEach(function (key) {
                var params = [], formatDate = function (date) {
                        return date.toUTCString().replace(/^\w+, 0?(\d+) (\w+) (\d+).*/, '$1-$2-$3');
                    }, escapeParam = function (param) {
                        if (typeof param === 'number') {
                            return {
                                type: 'number',
                                value: param
                            };
                        } else if (typeof param === 'string') {
                            if (/[\u0080-\uFFFF]/.test(param)) {
                                isAscii = false;
                                return {
                                    type: 'literal',
                                    value: mimefuncs.fromTypedArray(mimefuncs.charset.encode(param))
                                };
                            }
                            return {
                                type: 'string',
                                value: param
                            };
                        } else if (Object.prototype.toString.call(param) === '[object Date]') {
                            return {
                                type: 'atom',
                                value: formatDate(param)
                            };
                        } else if (Array.isArray(param)) {
                            return param.map(escapeParam);
                        } else if (typeof param === 'object') {
                            return buildTerm(param);
                        }
                    };
                params.push({
                    type: 'atom',
                    value: key.toUpperCase()
                });
                [].concat(query[key] || []).forEach(function (param) {
                    switch (key.toLowerCase()) {
                    case 'uid':
                        param = {
                            type: 'sequence',
                            value: param
                        };
                        break;
                    default:
                        param = escapeParam(param);
                    }
                    if (param) {
                        params = params.concat(param || []);
                    }
                });
                list = list.concat(params || []);
            });
            return list;
        };
        command.attributes = [].concat(buildTerm(query || {}) || []);
        if (!isAscii) {
            command.attributes.unshift({
                type: 'atom',
                value: 'UTF-8'
            });
            command.attributes.unshift({
                type: 'atom',
                value: 'CHARSET'
            });
        }
        return command;
    };
    BrowserBox.prototype._parseSEARCH = function (response) {
        var list = [];
        if (!response || !response.payload || !response.payload.SEARCH || !response.payload.SEARCH.length) {
            return [];
        }
        [].concat(response.payload.SEARCH || []).forEach(function (result) {
            [].concat(result.attributes || []).forEach(function (nr) {
                nr = Number(nr && nr.value || nr || 0) || 0;
                if (list.indexOf(nr) < 0) {
                    list.push(nr);
                }
            });
        }.bind(this));
        list.sort(function (a, b) {
            return a - b;
        });
        return list;
    };
    BrowserBox.prototype._buildSTORECommand = function (sequence, flags, options) {
        var command = {
                command: options.byUid ? 'UID STORE' : 'STORE',
                attributes: [{
                        type: 'sequence',
                        value: sequence
                    }]
            }, key = '', list = [];
        if (Array.isArray(flags) || typeof flags !== 'object') {
            flags = { set: flags };
        }
        if (flags.add) {
            list = [].concat(flags.add || []);
            key = '+';
        } else if (flags.set) {
            key = '';
            list = [].concat(flags.set || []);
        } else if (flags.remove) {
            key = '-';
            list = [].concat(flags.remove || []);
        }
        command.attributes.push({
            type: 'atom',
            value: key + 'FLAGS' + (options.silent ? '.SILENT' : '')
        });
        command.attributes.push(list.map(function (flag) {
            return {
                type: 'atom',
                value: flag
            };
        }));
        return command;
    };
    BrowserBox.prototype._changeState = function (newState) {
        if (newState === this.state) {
            return;
        }
        axe.debug(DEBUG_TAG, this.options.sessionId + ' entering state: ' + this.state);
        if (this.state === this.STATE_SELECTED && this.selectedMailbox) {
            this.onclosemailbox(this.selectedMailbox);
            this.selectedMailbox = false;
        }
        this.state = newState;
    };
    BrowserBox.prototype._ensurePath = function (tree, path, delimiter) {
        var names = path.split(delimiter);
        var branch = tree;
        var i, j, found;
        for (i = 0; i < names.length; i++) {
            found = false;
            for (j = 0; j < branch.children.length; j++) {
                if (this._compareMailboxNames(branch.children[j].name, utf7.imap.decode(names[i]))) {
                    branch = branch.children[j];
                    found = true;
                    break;
                }
            }
            if (!found) {
                branch.children.push({
                    name: utf7.imap.decode(names[i]),
                    delimiter: delimiter,
                    path: names.slice(0, i + 1).join(delimiter),
                    children: []
                });
                branch = branch.children[branch.children.length - 1];
            }
        }
        return branch;
    };
    BrowserBox.prototype._compareMailboxNames = function (a, b) {
        return (a.toUpperCase() === 'INBOX' ? 'INBOX' : a) === (b.toUpperCase() === 'INBOX' ? 'INBOX' : b);
    };
    BrowserBox.prototype._checkSpecialUse = function (mailbox) {
        var i, type;
        if (mailbox.flags) {
            for (i = 0; i < SPECIAL_USE_FLAGS.length; i++) {
                type = SPECIAL_USE_FLAGS[i];
                if ((mailbox.flags || []).indexOf(type) >= 0) {
                    mailbox.specialUse = type;
                    return type;
                }
            }
        }
        return this._checkSpecialUseByName(mailbox);
    };
    BrowserBox.prototype._checkSpecialUseByName = function (mailbox) {
        var name = (mailbox.name || '').toLowerCase().trim(), i, type;
        for (i = 0; i < SPECIAL_USE_BOX_FLAGS.length; i++) {
            type = SPECIAL_USE_BOX_FLAGS[i];
            if (SPECIAL_USE_BOXES[type].indexOf(name) >= 0) {
                mailbox.specialUse = type;
                mailbox.specialUseFlag = type;
                return type;
            }
        }
        return false;
    };
    BrowserBox.prototype._buildXOAuth2Token = function (user, token) {
        var authData = [
            'user=' + (user || ''),
            'auth=Bearer ' + token,
            '',
            ''
        ];
        return mimefuncs.base64.encode(authData.join('\x01'));
    };
    function callbackPromise(resolve, reject) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            var err = args.shift();
            if (err) {
                reject(err);
            } else {
                resolve.apply(null, args);
            }
        };
    }
    return BrowserBox;
}));
define('oauth', [
    'require',
    'exports',
    'module',
    './errorutils',
    './syncbase',
    'logic',
    './date'
], function (require, exports) {
    var errorutils = require('./errorutils');
    var syncbase = require('./syncbase');
    var logic = require('logic');
    var date = require('./date');
    var RENEW_WINDOW_MS = 30 * 60 * 1000;
    var TIMEOUT_MS = 30 * 1000;
    var scope = logic.scope('Oauth');
    exports.isRenewPossible = function (credentials) {
        var oauth2 = credentials.oauth2, lastRenew = oauth2 && (oauth2._transientLastRenew || 0), now = date.PERFNOW();
        if (!oauth2) {
            return false;
        }
        if (!oauth2 || lastRenew && now - lastRenew < RENEW_WINDOW_MS) {
            return false;
        } else {
            return true;
        }
    };
    exports.ensureUpdatedCredentials = function (credentials, credsUpdatedCallback, forceRenew) {
        if (forceRenew) {
            console.log('ensureUpdatedCredentials: force renewing token');
        }
        var oauth2 = credentials.oauth2;
        if (oauth2 && (!oauth2.accessToken || oauth2.expireTimeMS < date.NOW()) || forceRenew) {
            return renewAccessToken(oauth2).then(function (newTokenData) {
                oauth2.accessToken = newTokenData.accessToken;
                oauth2.expireTimeMS = newTokenData.expireTimeMS;
                logic(scope, 'credentials-changed', {
                    _accessToken: oauth2.accessToken,
                    expireTimeMS: oauth2.expireTimeMS
                });
                if (credsUpdatedCallback) {
                    credsUpdatedCallback(credentials);
                }
            });
        } else {
            logic(scope, 'credentials-ok');
            return Promise.resolve(false);
        }
    };
    function renewAccessToken(oauthInfo) {
        logic(scope, 'renewing-access-token');
        return new Promise(function (resolve, reject) {
            oauthInfo._transientLastRenew = date.PERFNOW();
            var xhr = logic.interceptable('oauth:renew-xhr', function () {
                return new XMLHttpRequest({ mozSystem: true });
            });
            xhr.open('POST', oauthInfo.tokenEndpoint, true);
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            xhr.timeout = syncbase.CONNECT_TIMEOUT_MS;
            xhr.send([
                'client_id=',
                encodeURIComponent(oauthInfo.clientId),
                '&client_secret=',
                encodeURIComponent(oauthInfo.clientSecret),
                '&refresh_token=',
                encodeURIComponent(oauthInfo.refreshToken),
                '&grant_type=refresh_token'
            ].join(''));
            xhr.onload = function () {
                if (xhr.status < 200 || xhr.status >= 300) {
                    try {
                        var errResp = JSON.parse(xhr.responseText);
                    } catch (ex) {
                    }
                    logic(scope, 'xhr-fail', {
                        tokenEndpoint: oauthInfo.tokenEndpoint,
                        status: xhr.status,
                        errResp: errResp
                    });
                    reject('needs-oauth-reauth');
                } else {
                    try {
                        var data = JSON.parse(xhr.responseText);
                        if (data && data.access_token) {
                            logic(scope, 'got-access-token', { _accessToken: data.access_token });
                            var expiresInMS = data.expires_in * 1000;
                            var expireTimeMS = date.NOW() + Math.max(0, expiresInMS - TIMEOUT_MS);
                            resolve({
                                accessToken: data.access_token,
                                expireTimeMS: expireTimeMS
                            });
                        } else {
                            logic(scope, 'no-access-token', { data: xhr.responseText });
                            reject('needs-oauth-reauth');
                        }
                    } catch (e) {
                        logic(scope, 'bad-json', {
                            error: e,
                            data: xhr.responseText
                        });
                        reject('needs-oauth-reauth');
                    }
                }
            };
            xhr.onerror = function (err) {
                reject(errorutils.analyzeException(err));
            };
            xhr.ontimeout = function () {
                reject('unresponsive-server');
            };
        });
    }
});
define('imap/client', [
    'require',
    'exports',
    'module',
    'browserbox',
    'browserbox-imap',
    'imap-handler',
    'logic',
    '../syncbase',
    '../errorutils',
    '../oauth'
], function (require, exports) {
    var BrowserBox = require('browserbox');
    var ImapClient = require('browserbox-imap');
    var imapHandler = require('imap-handler');
    var logic = require('logic');
    var syncbase = require('../syncbase');
    var errorutils = require('../errorutils');
    var oauth = require('../oauth');
    var setTimeout = window.setTimeout;
    var clearTimeout = window.clearTimeout;
    exports.setTimeoutFunctions = function (setFn, clearFn) {
        setTimeout = setFn;
        clearTimeout = clearFn;
    };
    function noop() {
    }
    var scope = logic.scope('ImapClient');
    exports.createImapConnection = function (credentials, connInfo, credsUpdatedCallback) {
        var conn;
        return oauth.ensureUpdatedCredentials(credentials, credsUpdatedCallback).then(function () {
            return new Promise(function (resolve, reject) {
                conn = new BrowserBox(connInfo.hostname, connInfo.port, {
                    auth: {
                        user: credentials.username,
                        pass: credentials.password,
                        xoauth2: credentials.oauth2 ? credentials.oauth2.accessToken : null
                    },
                    id: {
                        vendor: 'Mozilla',
                        name: 'GaiaMail',
                        version: '0.2',
                        'support-url': 'http://mzl.la/file-gaia-email-bug'
                    },
                    useSecureTransport: connInfo.crypto === 'ssl' || connInfo.crypto === true,
                    requireTLS: connInfo.crypto === 'starttls',
                    ignoreTLS: connInfo.crypto === 'plain'
                });
                var connectTimeout = setTimeout(function () {
                    conn.onerror('unresponsive-server');
                    conn.close();
                }, syncbase.CONNECT_TIMEOUT_MS);
                conn.onauth = function () {
                    clearTimeout(connectTimeout);
                    logic(scope, 'connected', { connInfo: connInfo });
                    conn.onauth = conn.onerror = noop;
                    resolve(conn);
                };
                conn.onerror = function (err) {
                    clearTimeout(connectTimeout);
                    reject(err);
                };
                conn.connect();
            });
        }).catch(function (errorObject) {
            var errorString = normalizeImapError(conn, errorObject);
            if (conn) {
                conn.close();
            }
            if (errorString === 'needs-oauth-reauth' && oauth.isRenewPossible(credentials)) {
                return oauth.ensureUpdatedCredentials(credentials, credsUpdatedCallback, true).then(function () {
                    return exports.createImapConnection(credentials, connInfo, credsUpdatedCallback);
                });
            } else {
                logic(scope, 'connect-error', { error: errorString });
                throw errorString;
            }
        });
    };
    var processResponse = ImapClient.prototype._processResponse;
    ImapClient.prototype._processResponse = function (response) {
        processResponse.apply(this, arguments);
        var cmd = (response && response.command || '').toString().toUpperCase().trim();
        if ([
                'NO',
                'BAD'
            ].indexOf(cmd) !== -1) {
            logic(scope, 'protocol-error', {
                humanReadable: response.humanReadable,
                responseCode: response.code,
                commandData: this._currentCommand && this._currentCommand.request && imapHandler.compiler(this._currentCommand.request)
            });
            this._lastImapError = {
                command: this._currentCommand,
                response: response
            };
        }
    };
    ImapClient.prototype._onError = function (evt) {
        if (this.isError(evt)) {
            this.onerror(evt);
        } else if (evt && this.isError(evt.data)) {
            this.onerror(evt.data);
        } else {
            this.onerror(evt && evt.data && evt.data.message || evt.data || evt || 'Error');
        }
        this.close();
    };
    function analyzeLastImapError(lastErrInfo, conn) {
        if (!lastErrInfo || !lastErrInfo.response) {
            return null;
        }
        if (lastErrInfo.command && lastErrInfo.command.request && lastErrInfo.command.request.command === 'STARTTLS') {
            return 'bad-security';
        }
        var wasOauth = conn && !!conn.options.auth.xoauth2;
        var err = lastErrInfo.response;
        var str = (err.code || '') + (err.humanReadable || '');
        if (/Your account is not enabled for IMAP use/.test(str) || /IMAP access is disabled for your domain/.test(str)) {
            return 'imap-disabled';
        } else if (/UNAVAILABLE/.test(str)) {
            return 'server-maintenance';
        } else if (conn.capability.indexOf('LOGINDISABLED') != -1 && !conn.authenticated) {
            return 'server-maintenance';
        } else if (/AUTHENTICATIONFAILED/.test(str) || /Invalid credentials/i.test(str) || /login failed/i.test(str) || /password/.test(str) || !conn.authenticated) {
            if (wasOauth) {
                return 'needs-oauth-reauth';
            } else {
                return 'bad-user-or-pass';
            }
        } else {
            return null;
        }
    }
    var normalizeImapError = exports.normalizeImapError = function (conn, err) {
        var socketLevelError = errorutils.analyzeException(err);
        var protocolLevelError = conn && analyzeLastImapError(conn.client._lastImapError, conn);
        var reportAs = socketLevelError || protocolLevelError || 'unknown';
        logic(scope, 'normalized-error', {
            error: err,
            errorName: err && err.name,
            errorMessage: err && err.message,
            errorStack: err && err.stack,
            socketLevelError: socketLevelError,
            protocolLevelError: protocolLevelError,
            reportAs: reportAs
        });
        return reportAs;
    };
});
define('imap/account', [
    'logic',
    '../a64',
    '../accountmixins',
    '../allback',
    '../errbackoff',
    '../mailslice',
    '../searchfilter',
    '../syncbase',
    '../util',
    '../composite/incoming',
    './folder',
    './jobs',
    './client',
    '../errorutils',
    '../disaster-recovery',
    'module',
    'require',
    'exports'
], function (logic, $a64, $acctmixins, $allback, $errbackoff, $mailslice, $searchfilter, $syncbase, $util, incoming, $imapfolder, $imapjobs, $imapclient, errorutils, DisasterRecovery, $module, require, exports) {
    var bsearchForInsert = $util.bsearchForInsert;
    var allbackMaker = $allback.allbackMaker;
    var CompositeIncomingAccount = incoming.CompositeIncomingAccount;
    function cmpFolderPubPath(a, b) {
        return a.path.localeCompare(b.path);
    }
    function ImapAccount(universe, compositeAccount, accountId, credentials, connInfo, folderInfos, dbConn, existingProtoConn) {
        logic.defineScope(this, 'Account', {
            accountId: accountId,
            accountType: 'imap'
        });
        CompositeIncomingAccount.apply(this, [$imapfolder.ImapFolderSyncer].concat(Array.slice(arguments)));
        this._maxConnsAllowed = 3;
        this._pendingConn = null;
        this._ownedConns = [];
        this._demandedConns = [];
        this._backoffEndpoint = $errbackoff.createEndpoint('imap:' + this.id, this);
        if (existingProtoConn)
            this._reuseConnection(existingProtoConn);
        this._jobDriver = new $imapjobs.ImapJobDriver(this, this._folderInfos.$mutationState);
        this._TEST_doNotCloseFolder = false;
        this.ensureEssentialOfflineFolders();
    }
    exports.Account = exports.ImapAccount = ImapAccount;
    ImapAccount.prototype = Object.create(CompositeIncomingAccount.prototype);
    var properties = {
        type: 'imap',
        supportsServerFolders: true,
        toString: function () {
            return '[ImapAccount: ' + this.id + ']';
        },
        get isGmail() {
            return this.meta.capability.indexOf('X-GM-EXT-1') !== -1;
        },
        get isCoreMailServer() {
            return this.meta.capability.indexOf('X-CM-EXT-1') !== -1;
        },
        get sentMessagesAutomaticallyAppearInSentFolder() {
            return this.isGmail || this.isCoreMailServer;
        },
        get numActiveConns() {
            return this._ownedConns.length;
        },
        __folderDemandsConnection: function (folderId, label, callback, deathback, dieOnConnectFailure) {
            if (dieOnConnectFailure && !this.universe.online) {
                window.setZeroTimeout(deathback);
                return;
            }
            var demand = {
                folderId: folderId,
                label: label,
                callback: callback,
                deathback: deathback,
                dieOnConnectFailure: Boolean(dieOnConnectFailure)
            };
            this._demandedConns.push(demand);
            if (this._demandedConns.length > 1)
                return;
            if (this._allocateExistingConnection())
                return;
            this._makeConnectionIfPossible();
            return;
        },
        _killDieOnConnectFailureDemands: function () {
            for (var i = 0; i < this._demandedConns.length; i++) {
                var demand = this._demandedConns[i];
                if (demand.dieOnConnectFailure) {
                    demand.deathback.call(null);
                    this._demandedConns.splice(i--, 1);
                }
            }
        },
        _allocateExistingConnection: function () {
            if (!this._demandedConns.length)
                return false;
            var demandInfo = this._demandedConns[0];
            var reusableConnInfo = null;
            for (var i = 0; i < this._ownedConns.length; i++) {
                var connInfo = this._ownedConns[i];
                if (demandInfo.folderId && connInfo.folderId === demandInfo.folderId)
                    logic(this, 'folderAlreadyHasConn', { folderId: demandInfo.folderId });
                if (connInfo.inUseBy)
                    continue;
                connInfo.inUseBy = demandInfo;
                this._demandedConns.shift();
                logic(this, 'reuseConnection', {
                    folderId: demandInfo.folderId,
                    label: demandInfo.label
                });
                demandInfo.callback(connInfo.conn);
                return true;
            }
            return false;
        },
        allOperationsCompleted: function () {
            this.maybeCloseUnusedConnections();
        },
        maybeCloseUnusedConnections: function () {
            if ($syncbase.KILL_CONNECTIONS_WHEN_JOBLESS && !this._demandedConns.length && !this.universe.areServerJobsWaiting(this)) {
                this.closeUnusedConnections();
            }
        },
        closeUnusedConnections: function () {
            for (var i = this._ownedConns.length - 1; i >= 0; i--) {
                var connInfo = this._ownedConns[i];
                if (connInfo.inUseBy)
                    continue;
                console.log('Killing unused IMAP connection.');
                this._ownedConns.splice(i, 1);
                connInfo.conn.client.close();
                logic(this, 'deadConnection', { reason: 'unused' });
            }
        },
        _makeConnectionIfPossible: function () {
            if (this._ownedConns.length >= this._maxConnsAllowed) {
                logic(this, 'maximumConnsNoNew');
                return;
            }
            if (this._pendingConn) {
                return;
            }
            this._pendingConn = true;
            var boundMakeConnection = this._makeConnection.bind(this);
            this._backoffEndpoint.scheduleConnectAttempt(boundMakeConnection);
        },
        _makeConnection: function (callback, whyFolderId, whyLabel) {
            this._pendingConn = true;
            require(['./client'], function ($imapclient) {
                logic(this, 'createConnection', {
                    folderId: whyFolderId,
                    label: whyLabel
                });
                $imapclient.createImapConnection(this._credentials, this._connInfo, function onCredentialsUpdated() {
                    return new Promise(function (resolve) {
                        this.universe.saveAccountDef(this.compositeAccount.accountDef, null, resolve);
                    }.bind(this));
                }.bind(this)).then(function (conn) {
                    DisasterRecovery.associateSocketWithAccount(conn.client.socket, this);
                    this._pendingConn = null;
                    this._bindConnectionDeathHandlers(conn);
                    this._backoffEndpoint.noteConnectSuccess();
                    this._ownedConns.push({
                        conn: conn,
                        inUseBy: null
                    });
                    this._allocateExistingConnection();
                    if (this._demandedConns.length) {
                        this._makeConnectionIfPossible();
                    }
                    callback && callback(null);
                }.bind(this)).catch(function (err) {
                    logic(this, 'deadConnection', {
                        reason: 'connect-error',
                        folderId: whyFolderId
                    });
                    if (errorutils.shouldReportProblem(err)) {
                        this.universe.__reportAccountProblem(this.compositeAccount, err, 'incoming');
                    }
                    this._pendingConn = null;
                    callback && callback(err);
                    if (errorutils.shouldRetry(err)) {
                        if (this._backoffEndpoint.noteConnectFailureMaybeRetry(errorutils.wasErrorFromReachableState(err))) {
                            this._makeConnectionIfPossible();
                        } else {
                            this._killDieOnConnectFailureDemands();
                        }
                    } else {
                        this._backoffEndpoint.noteBrokenConnection();
                        this._killDieOnConnectFailureDemands();
                    }
                }.bind(this));
            }.bind(this));
        },
        _reuseConnection: function (existingProtoConn) {
            DisasterRecovery.associateSocketWithAccount(existingProtoConn.client.socket, this);
            this._ownedConns.push({
                conn: existingProtoConn,
                inUseBy: null
            });
            this._bindConnectionDeathHandlers(existingProtoConn);
        },
        _bindConnectionDeathHandlers: function (conn) {
            conn.breakIdle(function () {
                conn.client.TIMEOUT_ENTER_IDLE = $syncbase.STALE_CONNECTION_TIMEOUT_MS;
                conn.client.onidle = function () {
                    console.warn('Killing stale IMAP connection.');
                    conn.client.close();
                };
                conn.client._enterIdle();
            });
            conn.onclose = function () {
                for (var i = 0; i < this._ownedConns.length; i++) {
                    var connInfo = this._ownedConns[i];
                    if (connInfo.conn === conn) {
                        logic(this, 'deadConnection', {
                            reason: 'closed',
                            folderId: connInfo.inUseBy && connInfo.inUseBy.folderId
                        });
                        if (connInfo.inUseBy && connInfo.inUseBy.deathback)
                            connInfo.inUseBy.deathback(conn);
                        connInfo.inUseBy = null;
                        this._ownedConns.splice(i, 1);
                        return;
                    }
                }
            }.bind(this);
            conn.onerror = function (err) {
                err = $imapclient.normalizeImapError(conn, err);
                logic(this, 'connectionError', { error: err });
                console.error('imap:onerror', JSON.stringify({
                    error: err,
                    host: this._connInfo.hostname,
                    port: this._connInfo.port
                }));
            }.bind(this);
        },
        __folderDoneWithConnection: function (conn, closeFolder, resourceProblem) {
            for (var i = 0; i < this._ownedConns.length; i++) {
                var connInfo = this._ownedConns[i];
                if (connInfo.conn === conn) {
                    if (resourceProblem)
                        this._backoffEndpoint(connInfo.inUseBy.folderId);
                    logic(this, 'releaseConnection', {
                        folderId: connInfo.inUseBy.folderId,
                        label: connInfo.inUseBy.label
                    });
                    connInfo.inUseBy = null;
                    this.maybeCloseUnusedConnections();
                    return;
                }
            }
            logic(this, 'connectionMismatch');
        },
        _syncFolderList: function (conn, callback) {
            conn.listMailboxes(this._syncFolderComputeDeltas.bind(this, conn, callback));
        },
        _determineFolderType: function (box, path) {
            var attribs = (box.flags || []).map(function (flag) {
                return flag.substr(1).toUpperCase();
            });
            var type = null;
            if (attribs.indexOf('NOSELECT') !== -1) {
                type = 'nomail';
            } else {
                for (var i = 0; i < attribs.length; i++) {
                    switch (attribs[i]) {
                    case 'ALL':
                    case 'ALLMAIL':
                    case 'ARCHIVE':
                        type = 'archive';
                        break;
                    case 'DRAFTS':
                        type = 'drafts';
                        break;
                    case 'FLAGGED':
                        type = 'starred';
                        break;
                    case 'IMPORTANT':
                        type = 'important';
                        break;
                    case 'INBOX':
                        type = 'inbox';
                        break;
                    case 'JUNK':
                        type = 'junk';
                        break;
                    case 'SENT':
                        type = 'sent';
                        break;
                    case 'SPAM':
                        type = 'junk';
                        break;
                    case 'STARRED':
                        type = 'starred';
                        break;
                    case 'TRASH':
                        type = 'trash';
                        break;
                    case 'HASCHILDREN':
                    case 'HASNOCHILDREN':
                    case 'MARKED':
                    case 'UNMARKED':
                    case 'NOINFERIORS':
                    default:
                    }
                }
                if (!type) {
                    var prefix = this._namespaces.personal[0] && this._namespaces.personal[0].prefix;
                    var isAtNamespaceRoot = path === prefix + box.name;
                    if (isAtNamespaceRoot || path === box.name) {
                        switch (box.name.toUpperCase()) {
                        case 'DRAFT':
                        case 'DRAFTS':
                            type = 'drafts';
                            break;
                        case 'INBOX':
                            if (path.toUpperCase() === 'INBOX')
                                type = 'inbox';
                            break;
                        case 'BULK MAIL':
                        case 'JUNK':
                        case 'SPAM':
                            type = 'junk';
                            break;
                        case 'SENT':
                            type = 'sent';
                            break;
                        case 'TRASH':
                            type = 'trash';
                            break;
                        case 'UNSENT MESSAGES':
                            type = 'queue';
                            break;
                        }
                    }
                }
                if (!type)
                    type = 'normal';
            }
            return type;
        },
        _namespaces: {
            personal: {
                prefix: '',
                delimiter: '/'
            },
            provisional: true
        },
        _syncFolderComputeDeltas: function (conn, callback, err, boxesRoot) {
            var self = this;
            if (err) {
                callback(err);
                return;
            }
            if (self._namespaces.provisional) {
                conn.listNamespaces(function (err, namespaces) {
                    if (!err && namespaces) {
                        self._namespaces = namespaces;
                    }
                    self._namespaces.provisional = false;
                    logic(self, 'list-namespaces', { namespaces: namespaces });
                    self._syncFolderComputeDeltas(conn, callback, err, boxesRoot);
                });
                return;
            }
            var folderPubsByPath = {};
            var folderPub;
            for (var iFolder = 0; iFolder < this.folders.length; iFolder++) {
                folderPub = this.folders[iFolder];
                folderPubsByPath[folderPub.path] = folderPub;
            }
            var syncScope = logic.scope('ImapFolderSync');
            function walkBoxes(boxLevel, pathDepth, parentId) {
                boxLevel.forEach(function (box) {
                    var boxName = box.name, meta, folderId;
                    var delim = box.delimiter || '/';
                    if (box.path.indexOf(delim) === 0) {
                        box.path = box.path.slice(delim.length);
                    }
                    var path = box.path;
                    var type = self._determineFolderType(box, path);
                    if (type === 'inbox')
                        path = 'INBOX';
                    if (folderPubsByPath.hasOwnProperty(path)) {
                        meta = folderPubsByPath[path];
                        meta.name = box.name;
                        meta.delim = delim;
                        logic(syncScope, 'folder-sync:existing', {
                            type: type,
                            name: box.name,
                            path: path,
                            delim: delim
                        });
                        folderPubsByPath[path] = true;
                    } else {
                        logic(syncScope, 'folder-sync:add', {
                            type: type,
                            name: box.name,
                            path: path,
                            delim: delim
                        });
                        meta = self._learnAboutFolder(box.name, path, parentId, type, delim, pathDepth);
                    }
                    if (box.children)
                        walkBoxes(box.children, pathDepth + 1, meta.id);
                });
            }
            walkBoxes(boxesRoot.children, 0, null);
            var deadFolderIds = [];
            for (var folderPath in folderPubsByPath) {
                folderPub = folderPubsByPath[folderPath];
                if (folderPub === true)
                    continue;
                if ($mailslice.FolderStorage.isTypeLocalOnly(folderPub.type))
                    continue;
                logic(syncScope, 'delete-dead-folder', {
                    folderType: folderPub.type,
                    folderId: folderPub.id
                });
                this._forgetFolder(folderPub.id);
            }
            this.ensureEssentialOnlineFolders();
            this.normalizeFolderHierarchy();
            callback(null);
        },
        ensureEssentialOfflineFolders: function () {
            [
                'outbox',
                'localdrafts'
            ].forEach(function (folderType) {
                if (!this.getFirstFolderWithType(folderType)) {
                    this._learnAboutFolder(folderType, folderType, null, folderType, '', 0, true);
                }
            }, this);
        },
        ensureEssentialOnlineFolders: function (callback) {
            var essentialFolders = {
                'trash': 'Trash',
                'sent': 'Sent'
            };
            var latch = $allback.latch();
            for (var type in essentialFolders) {
                if (!this.getFirstFolderWithType(type)) {
                    this.universe.createFolder(this.id, null, essentialFolders[type], type, false, latch.defer());
                }
            }
            latch.then(callback);
        },
        normalizeFolderHierarchy: $acctmixins.normalizeFolderHierarchy,
        saveSentMessage: function (composer) {
            if (this.sentMessagesAutomaticallyAppearInSentFolder) {
                return;
            }
            composer.withMessageBlob({ includeBcc: true }, function (blob) {
                var message = {
                    messageText: blob,
                    flags: ['\\Seen']
                };
                var sentFolder = this.getFirstFolderWithType('sent');
                if (sentFolder) {
                    this.universe.appendMessages(sentFolder.id, [message]);
                }
            }.bind(this));
        },
        shutdown: function (callback) {
            CompositeIncomingAccount.prototype.shutdownFolders.call(this);
            this._backoffEndpoint.shutdown();
            var liveConns = this._ownedConns.length;
            function connDead() {
                if (--liveConns === 0)
                    callback();
            }
            for (var i = 0; i < this._ownedConns.length; i++) {
                var connInfo = this._ownedConns[i];
                if (callback) {
                    connInfo.inUseBy = { deathback: connDead };
                    try {
                        connInfo.conn.client.close();
                    } catch (ex) {
                        liveConns--;
                    }
                } else {
                    connInfo.conn.client.close();
                }
            }
            if (!liveConns && callback)
                callback();
        },
        checkAccount: function (listener) {
            logic(this, 'checkAccount_begin');
            this._makeConnection(function (err) {
                logic(this, 'checkAccount_end', { error: err });
                listener(err);
            }.bind(this), null, 'check');
        },
        accountDeleted: function () {
            this._alive = false;
            this.shutdown();
        }
    };
    for (var k in properties) {
        Object.defineProperty(ImapAccount.prototype, k, Object.getOwnPropertyDescriptor(properties, k));
    }
});
;
define('md5', [
    'require',
    'exports',
    'module'
], function (require, exports, module) {
    module.exports = function md5(data) {
        return hex_md5(data);
    };
    var hexcase = 0;
    var b64pad = '';
    function hex_md5(s) {
        return rstr2hex(rstr_md5(str2rstr_utf8(s)));
    }
    function b64_md5(s) {
        return rstr2b64(rstr_md5(str2rstr_utf8(s)));
    }
    function any_md5(s, e) {
        return rstr2any(rstr_md5(str2rstr_utf8(s)), e);
    }
    function hex_hmac_md5(k, d) {
        return rstr2hex(rstr_hmac_md5(str2rstr_utf8(k), str2rstr_utf8(d)));
    }
    function b64_hmac_md5(k, d) {
        return rstr2b64(rstr_hmac_md5(str2rstr_utf8(k), str2rstr_utf8(d)));
    }
    function any_hmac_md5(k, d, e) {
        return rstr2any(rstr_hmac_md5(str2rstr_utf8(k), str2rstr_utf8(d)), e);
    }
    function md5_vm_test() {
        return hex_md5('abc').toLowerCase() == '900150983cd24fb0d6963f7d28e17f72';
    }
    function rstr_md5(s) {
        return binl2rstr(binl_md5(rstr2binl(s), s.length * 8));
    }
    function rstr_hmac_md5(key, data) {
        var bkey = rstr2binl(key);
        if (bkey.length > 16)
            bkey = binl_md5(bkey, key.length * 8);
        var ipad = Array(16), opad = Array(16);
        for (var i = 0; i < 16; i++) {
            ipad[i] = bkey[i] ^ 909522486;
            opad[i] = bkey[i] ^ 1549556828;
        }
        var hash = binl_md5(ipad.concat(rstr2binl(data)), 512 + data.length * 8);
        return binl2rstr(binl_md5(opad.concat(hash), 512 + 128));
    }
    function rstr2hex(input) {
        try {
            hexcase;
        } catch (e) {
            hexcase = 0;
        }
        var hex_tab = hexcase ? '0123456789ABCDEF' : '0123456789abcdef';
        var output = '';
        var x;
        for (var i = 0; i < input.length; i++) {
            x = input.charCodeAt(i);
            output += hex_tab.charAt(x >>> 4 & 15) + hex_tab.charAt(x & 15);
        }
        return output;
    }
    function rstr2b64(input) {
        try {
            b64pad;
        } catch (e) {
            b64pad = '';
        }
        var tab = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        var output = '';
        var len = input.length;
        for (var i = 0; i < len; i += 3) {
            var triplet = input.charCodeAt(i) << 16 | (i + 1 < len ? input.charCodeAt(i + 1) << 8 : 0) | (i + 2 < len ? input.charCodeAt(i + 2) : 0);
            for (var j = 0; j < 4; j++) {
                if (i * 8 + j * 6 > input.length * 8)
                    output += b64pad;
                else
                    output += tab.charAt(triplet >>> 6 * (3 - j) & 63);
            }
        }
        return output;
    }
    function rstr2any(input, encoding) {
        var divisor = encoding.length;
        var i, j, q, x, quotient;
        var dividend = Array(Math.ceil(input.length / 2));
        for (i = 0; i < dividend.length; i++) {
            dividend[i] = input.charCodeAt(i * 2) << 8 | input.charCodeAt(i * 2 + 1);
        }
        var full_length = Math.ceil(input.length * 8 / (Math.log(encoding.length) / Math.log(2)));
        var remainders = Array(full_length);
        for (j = 0; j < full_length; j++) {
            quotient = Array();
            x = 0;
            for (i = 0; i < dividend.length; i++) {
                x = (x << 16) + dividend[i];
                q = Math.floor(x / divisor);
                x -= q * divisor;
                if (quotient.length > 0 || q > 0)
                    quotient[quotient.length] = q;
            }
            remainders[j] = x;
            dividend = quotient;
        }
        var output = '';
        for (i = remainders.length - 1; i >= 0; i--)
            output += encoding.charAt(remainders[i]);
        return output;
    }
    function str2rstr_utf8(input) {
        var output = '';
        var i = -1;
        var x, y;
        while (++i < input.length) {
            x = input.charCodeAt(i);
            y = i + 1 < input.length ? input.charCodeAt(i + 1) : 0;
            if (55296 <= x && x <= 56319 && 56320 <= y && y <= 57343) {
                x = 65536 + ((x & 1023) << 10) + (y & 1023);
                i++;
            }
            if (x <= 127)
                output += String.fromCharCode(x);
            else if (x <= 2047)
                output += String.fromCharCode(192 | x >>> 6 & 31, 128 | x & 63);
            else if (x <= 65535)
                output += String.fromCharCode(224 | x >>> 12 & 15, 128 | x >>> 6 & 63, 128 | x & 63);
            else if (x <= 2097151)
                output += String.fromCharCode(240 | x >>> 18 & 7, 128 | x >>> 12 & 63, 128 | x >>> 6 & 63, 128 | x & 63);
        }
        return output;
    }
    function str2rstr_utf16le(input) {
        var output = '';
        for (var i = 0; i < input.length; i++)
            output += String.fromCharCode(input.charCodeAt(i) & 255, input.charCodeAt(i) >>> 8 & 255);
        return output;
    }
    function str2rstr_utf16be(input) {
        var output = '';
        for (var i = 0; i < input.length; i++)
            output += String.fromCharCode(input.charCodeAt(i) >>> 8 & 255, input.charCodeAt(i) & 255);
        return output;
    }
    function rstr2binl(input) {
        var output = Array(input.length >> 2);
        for (var i = 0; i < output.length; i++)
            output[i] = 0;
        for (var i = 0; i < input.length * 8; i += 8)
            output[i >> 5] |= (input.charCodeAt(i / 8) & 255) << i % 32;
        return output;
    }
    function binl2rstr(input) {
        var output = '';
        for (var i = 0; i < input.length * 32; i += 8)
            output += String.fromCharCode(input[i >> 5] >>> i % 32 & 255);
        return output;
    }
    function binl_md5(x, len) {
        x[len >> 5] |= 128 << len % 32;
        x[(len + 64 >>> 9 << 4) + 14] = len;
        var a = 1732584193;
        var b = -271733879;
        var c = -1732584194;
        var d = 271733878;
        for (var i = 0; i < x.length; i += 16) {
            var olda = a;
            var oldb = b;
            var oldc = c;
            var oldd = d;
            a = md5_ff(a, b, c, d, x[i + 0], 7, -680876936);
            d = md5_ff(d, a, b, c, x[i + 1], 12, -389564586);
            c = md5_ff(c, d, a, b, x[i + 2], 17, 606105819);
            b = md5_ff(b, c, d, a, x[i + 3], 22, -1044525330);
            a = md5_ff(a, b, c, d, x[i + 4], 7, -176418897);
            d = md5_ff(d, a, b, c, x[i + 5], 12, 1200080426);
            c = md5_ff(c, d, a, b, x[i + 6], 17, -1473231341);
            b = md5_ff(b, c, d, a, x[i + 7], 22, -45705983);
            a = md5_ff(a, b, c, d, x[i + 8], 7, 1770035416);
            d = md5_ff(d, a, b, c, x[i + 9], 12, -1958414417);
            c = md5_ff(c, d, a, b, x[i + 10], 17, -42063);
            b = md5_ff(b, c, d, a, x[i + 11], 22, -1990404162);
            a = md5_ff(a, b, c, d, x[i + 12], 7, 1804603682);
            d = md5_ff(d, a, b, c, x[i + 13], 12, -40341101);
            c = md5_ff(c, d, a, b, x[i + 14], 17, -1502002290);
            b = md5_ff(b, c, d, a, x[i + 15], 22, 1236535329);
            a = md5_gg(a, b, c, d, x[i + 1], 5, -165796510);
            d = md5_gg(d, a, b, c, x[i + 6], 9, -1069501632);
            c = md5_gg(c, d, a, b, x[i + 11], 14, 643717713);
            b = md5_gg(b, c, d, a, x[i + 0], 20, -373897302);
            a = md5_gg(a, b, c, d, x[i + 5], 5, -701558691);
            d = md5_gg(d, a, b, c, x[i + 10], 9, 38016083);
            c = md5_gg(c, d, a, b, x[i + 15], 14, -660478335);
            b = md5_gg(b, c, d, a, x[i + 4], 20, -405537848);
            a = md5_gg(a, b, c, d, x[i + 9], 5, 568446438);
            d = md5_gg(d, a, b, c, x[i + 14], 9, -1019803690);
            c = md5_gg(c, d, a, b, x[i + 3], 14, -187363961);
            b = md5_gg(b, c, d, a, x[i + 8], 20, 1163531501);
            a = md5_gg(a, b, c, d, x[i + 13], 5, -1444681467);
            d = md5_gg(d, a, b, c, x[i + 2], 9, -51403784);
            c = md5_gg(c, d, a, b, x[i + 7], 14, 1735328473);
            b = md5_gg(b, c, d, a, x[i + 12], 20, -1926607734);
            a = md5_hh(a, b, c, d, x[i + 5], 4, -378558);
            d = md5_hh(d, a, b, c, x[i + 8], 11, -2022574463);
            c = md5_hh(c, d, a, b, x[i + 11], 16, 1839030562);
            b = md5_hh(b, c, d, a, x[i + 14], 23, -35309556);
            a = md5_hh(a, b, c, d, x[i + 1], 4, -1530992060);
            d = md5_hh(d, a, b, c, x[i + 4], 11, 1272893353);
            c = md5_hh(c, d, a, b, x[i + 7], 16, -155497632);
            b = md5_hh(b, c, d, a, x[i + 10], 23, -1094730640);
            a = md5_hh(a, b, c, d, x[i + 13], 4, 681279174);
            d = md5_hh(d, a, b, c, x[i + 0], 11, -358537222);
            c = md5_hh(c, d, a, b, x[i + 3], 16, -722521979);
            b = md5_hh(b, c, d, a, x[i + 6], 23, 76029189);
            a = md5_hh(a, b, c, d, x[i + 9], 4, -640364487);
            d = md5_hh(d, a, b, c, x[i + 12], 11, -421815835);
            c = md5_hh(c, d, a, b, x[i + 15], 16, 530742520);
            b = md5_hh(b, c, d, a, x[i + 2], 23, -995338651);
            a = md5_ii(a, b, c, d, x[i + 0], 6, -198630844);
            d = md5_ii(d, a, b, c, x[i + 7], 10, 1126891415);
            c = md5_ii(c, d, a, b, x[i + 14], 15, -1416354905);
            b = md5_ii(b, c, d, a, x[i + 5], 21, -57434055);
            a = md5_ii(a, b, c, d, x[i + 12], 6, 1700485571);
            d = md5_ii(d, a, b, c, x[i + 3], 10, -1894986606);
            c = md5_ii(c, d, a, b, x[i + 10], 15, -1051523);
            b = md5_ii(b, c, d, a, x[i + 1], 21, -2054922799);
            a = md5_ii(a, b, c, d, x[i + 8], 6, 1873313359);
            d = md5_ii(d, a, b, c, x[i + 15], 10, -30611744);
            c = md5_ii(c, d, a, b, x[i + 6], 15, -1560198380);
            b = md5_ii(b, c, d, a, x[i + 13], 21, 1309151649);
            a = md5_ii(a, b, c, d, x[i + 4], 6, -145523070);
            d = md5_ii(d, a, b, c, x[i + 11], 10, -1120210379);
            c = md5_ii(c, d, a, b, x[i + 2], 15, 718787259);
            b = md5_ii(b, c, d, a, x[i + 9], 21, -343485551);
            a = safe_add(a, olda);
            b = safe_add(b, oldb);
            c = safe_add(c, oldc);
            d = safe_add(d, oldd);
        }
        return Array(a, b, c, d);
    }
    function md5_cmn(q, a, b, x, s, t) {
        return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s), b);
    }
    function md5_ff(a, b, c, d, x, s, t) {
        return md5_cmn(b & c | ~b & d, a, b, x, s, t);
    }
    function md5_gg(a, b, c, d, x, s, t) {
        return md5_cmn(b & d | c & ~d, a, b, x, s, t);
    }
    function md5_hh(a, b, c, d, x, s, t) {
        return md5_cmn(b ^ c ^ d, a, b, x, s, t);
    }
    function md5_ii(a, b, c, d, x, s, t) {
        return md5_cmn(c ^ (b | ~d), a, b, x, s, t);
    }
    function safe_add(x, y) {
        var lsw = (x & 65535) + (y & 65535);
        var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return msw << 16 | lsw & 65535;
    }
    function bit_rol(num, cnt) {
        return num << cnt | num >>> 32 - cnt;
    }
});
define('pop3/transport', [
    'mimefuncs',
    'exports'
], function (mimefuncs, exports) {
    var setTimeout = window.setTimeout.bind(window);
    var clearTimeout = window.clearTimeout.bind(window);
    var MAX_LINE_LENGTH = 512;
    var CR = '\r'.charCodeAt(0);
    var LF = '\n'.charCodeAt(0);
    var PERIOD = '.'.charCodeAt(0);
    var PLUS = '+'.charCodeAt(0);
    var MINUS = '-'.charCodeAt(0);
    var SPACE = ' '.charCodeAt(0);
    var textEncoder = new TextEncoder('utf-8', { fatal: false });
    function concatBuffers(a, b) {
        var buffer = new Uint8Array(a.length + b.length);
        buffer.set(a, 0);
        buffer.set(b, a.length);
        return buffer;
    }
    function Pop3Parser() {
        this.buffer = new Uint8Array(0);
        this.unprocessedLines = [];
    }
    Pop3Parser.prototype.push = function (data) {
        var buffer = this.buffer = concatBuffers(this.buffer, data);
        for (var i = 0; i < buffer.length - 1; i++) {
            if (buffer[i] === CR && buffer[i + 1] === LF) {
                var end = i + 1;
                if (end > MAX_LINE_LENGTH) {
                }
                this.unprocessedLines.push(buffer.subarray(0, end + 1));
                buffer = this.buffer = buffer.subarray(end + 1);
                i = -1;
            }
        }
    };
    Pop3Parser.prototype.extractResponse = function (multiline) {
        if (!this.unprocessedLines.length) {
            return null;
        }
        if (this.unprocessedLines[0][0] !== PLUS) {
            multiline = false;
        }
        if (!multiline) {
            return new Response([this.unprocessedLines.shift()], false);
        } else {
            var endLineIndex = -1;
            for (var i = 1; i < this.unprocessedLines.length; i++) {
                var line = this.unprocessedLines[i];
                if (line.byteLength === 3 && line[0] === PERIOD && line[1] === CR && line[2] === LF) {
                    endLineIndex = i;
                    break;
                }
            }
            if (endLineIndex === -1) {
                return null;
            }
            var lines = this.unprocessedLines.splice(0, endLineIndex + 1);
            lines.pop();
            for (var i = 1; i < endLineIndex; i++) {
                if (lines[i][0] === PERIOD) {
                    lines[i] = lines[i].subarray(1);
                }
            }
            return new Response(lines, true);
        }
    };
    function Response(lines, isMultiline) {
        this.lines = lines;
        this.isMultiline = isMultiline;
        this.ok = this.lines[0][0] === PLUS;
        this.err = !this.ok;
        this.request = null;
    }
    Response.prototype.getStatusLine = function () {
        return this.getLineAsString(0).replace(/^(\+OK|-ERR) /, '');
    };
    Response.prototype.getLineAsString = function (index) {
        return mimefuncs.fromTypedArray(this.lines[index]);
    };
    Response.prototype.getLinesAsString = function () {
        var lines = [];
        for (var i = 0; i < this.lines.length; i++) {
            lines.push(this.getLineAsString(i));
        }
        return lines;
    };
    Response.prototype.getDataLines = function () {
        var lines = [];
        for (var i = 1; i < this.lines.length; i++) {
            var line = this.getLineAsString(i);
            lines.push(line.slice(0, line.length - 2));
        }
        return lines;
    };
    Response.prototype.getDataAsString = function () {
        var lines = [];
        for (var i = 1; i < this.lines.length; i++) {
            lines.push(this.getLineAsString(i));
        }
        return lines.join('');
    };
    Response.prototype.toString = function () {
        return this.getLinesAsString().join('\r\n');
    };
    function Request(command, args, expectMultiline, cb) {
        this.command = command;
        this.args = args;
        this.expectMultiline = expectMultiline;
        this.onresponse = cb || null;
    }
    exports.Request = Request;
    Request.prototype.toByteArray = function () {
        return textEncoder.encode(this.command + (this.args.length ? ' ' + this.args.join(' ') : '') + '\r\n');
    };
    Request.prototype._respondWithError = function (desc) {
        var rsp = new Response([textEncoder.encode('-ERR ' + desc + '\r\n')], false);
        rsp.request = this;
        this.onresponse(rsp, null);
    };
    function Pop3Protocol() {
        this.parser = new Pop3Parser();
        this.onsend = function (data) {
            throw new Error('You must implement Pop3Protocol.onsend to send data.');
        };
        this.unsentRequests = [];
        this.pipeline = false;
        this.pendingRequests = [];
        this.closed = false;
    }
    exports.Response = Response;
    exports.Pop3Protocol = Pop3Protocol;
    Pop3Protocol.prototype.sendRequest = function (cmd, args, expectMultiline, cb) {
        var req;
        if (cmd instanceof Request) {
            req = cmd;
        } else {
            req = new Request(cmd, args, expectMultiline, cb);
        }
        if (this.closed) {
            req._respondWithError('(request sent after connection closed)');
            return;
        }
        if (this.pipeline || this.pendingRequests.length === 0) {
            this.onsend(req.toByteArray());
            this.pendingRequests.push(req);
        } else {
            this.unsentRequests.push(req);
        }
    };
    Pop3Protocol.prototype.onreceive = function (evt) {
        this.parser.push(new Uint8Array(evt.data));
        var response;
        while (true) {
            var req = this.pendingRequests[0];
            response = this.parser.extractResponse(req && req.expectMultiline);
            if (!response) {
                break;
            } else if (!req) {
                console.error('Unsolicited response from server: ' + response);
                break;
            }
            response.request = req;
            this.pendingRequests.shift();
            if (this.unsentRequests.length) {
                this.sendRequest(this.unsentRequests.shift());
            }
            if (req.onresponse) {
                if (response.err) {
                    req.onresponse(response, null);
                } else {
                    req.onresponse(null, response);
                }
            }
        }
    };
    Pop3Protocol.prototype.onclose = function () {
        this.closed = true;
        var requestsToRespond = this.pendingRequests.concat(this.unsentRequests);
        this.pendingRequests = [];
        this.unsentRequests = [];
        for (var i = 0; i < requestsToRespond.length; i++) {
            var req = requestsToRespond[i];
            req._respondWithError('(connection closed, no response)');
        }
    };
});
define('imap/imapchew', [
    'mimefuncs',
    '../db/mail_rep',
    '../mailchew',
    'mimeparser',
    'exports'
], function (mimefuncs, mailRep, $mailchew, MimeParser, exports) {
    function parseRfc2231CharsetEncoding(s) {
        var match = /^([^']*)'([^']*)'(.+)$/.exec(s);
        if (match) {
            return mimefuncs.mimeWordsDecode('=?' + (match[1] || 'us-ascii') + '?Q?' + match[3].replace(/%/g, '=') + '?=');
        }
        return null;
    }
    function stripArrows(s) {
        if (Array.isArray(s)) {
            return s.map(stripArrows);
        } else if (s && s[0] === '<') {
            return s.slice(1, -1);
        } else {
            return s;
        }
    }
    function firstHeader(msg, headerName) {
        return msg.headers[headerName] && msg.headers[headerName][0] || null;
    }
    function chewStructure(msg) {
        var attachments = [], bodyReps = [], unnamedPartCounter = 0, relatedParts = [];
        function estimatePartSizeInBytes(partInfo) {
            var encoding = partInfo.encoding.toLowerCase();
            if (encoding === 'base64') {
                return Math.floor(partInfo.size * 57 / 78);
            } else if (encoding === 'quoted-printable') {
                return partInfo.size;
            }
            return partInfo.size;
        }
        function chewNode(partInfo, parentMultipartSubtype) {
            var i, filename, disposition;
            var type = partInfo.type.split('/')[0];
            var subtype = partInfo.type.split('/')[1];
            if (type === 'multipart') {
                switch (subtype) {
                case 'alternative':
                    for (i = partInfo.childNodes.length - 1; i >= 0; i--) {
                        var subPartInfo = partInfo.childNodes[i];
                        var childType = subPartInfo.type.split('/')[0];
                        var childSubtype = subPartInfo.type.split('/')[1];
                        switch (childType) {
                        case 'text':
                            break;
                        case 'multipart':
                            if (chewNode(subPartInfo)) {
                                return true;
                            }
                            break;
                        default:
                            continue;
                        }
                        switch (childSubtype) {
                        case 'html':
                        case 'plain':
                            if (chewNode(subPartInfo), subtype) {
                                return true;
                            }
                        }
                    }
                    return false;
                case 'mixed':
                case 'signed':
                case 'related':
                    for (i = 0; i < partInfo.childNodes.length; i++) {
                        chewNode(partInfo.childNodes[i], subtype);
                    }
                    return true;
                default:
                    console.warn('Ignoring multipart type:', subtype);
                    return false;
                }
            } else {
                if (partInfo.parameters && partInfo.parameters.name) {
                    filename = mimefuncs.mimeWordsDecode(partInfo.parameters.name);
                } else if (partInfo.parameters && partInfo.parameters['name*']) {
                    filename = parseRfc2231CharsetEncoding(partInfo.parameters['name*']);
                } else if (partInfo.dispositionParameters && partInfo.dispositionParameters.filename) {
                    filename = mimefuncs.mimeWordsDecode(partInfo.dispositionParameters.filename);
                } else if (partInfo.dispositionParameters && partInfo.dispositionParameters['filename*']) {
                    filename = parseRfc2231CharsetEncoding(partInfo.dispositionParameters['filename*']);
                } else {
                    filename = null;
                }
                if (partInfo.disposition) {
                    if (partInfo.disposition.toLowerCase() == 'inline') {
                        if (type === 'text' || partInfo.id) {
                            disposition = 'inline';
                        } else {
                            disposition = 'attachment';
                        }
                    } else if (partInfo.disposition.toLowerCase() == 'attachment') {
                        disposition = 'attachment';
                    } else {
                        disposition = 'inline';
                    }
                } else if (parentMultipartSubtype === 'related' && partInfo.id && type === 'image') {
                    disposition = 'inline';
                } else if (filename || type !== 'text') {
                    disposition = 'attachment';
                } else {
                    disposition = 'inline';
                }
                if (type !== 'text' && type !== 'image') {
                    disposition = 'attachment';
                }
                if (type === 'application' && (subtype === 'pgp-signature' || subtype === 'pkcs7-signature')) {
                    return true;
                }
                var makePart = function (partInfo, filename) {
                    return mailRep.makeAttachmentPart({
                        name: filename || 'unnamed-' + ++unnamedPartCounter,
                        contentId: partInfo.id ? stripArrows(partInfo.id) : null,
                        type: partInfo.type.toLowerCase(),
                        part: partInfo.part,
                        encoding: partInfo.encoding && partInfo.encoding.toLowerCase(),
                        sizeEstimate: estimatePartSizeInBytes(partInfo),
                        file: null
                    });
                };
                var makeTextPart = function (partInfo) {
                    return mailRep.makeBodyPart({
                        type: subtype,
                        part: partInfo.part || '1',
                        sizeEstimate: partInfo.size,
                        amountDownloaded: 0,
                        isDownloaded: partInfo.size === 0,
                        _partInfo: partInfo.size ? {
                            partID: partInfo.part,
                            type: type,
                            subtype: subtype,
                            params: valuesOnly(partInfo.parameters),
                            encoding: partInfo.encoding && partInfo.encoding.toLowerCase()
                        } : null,
                        content: ''
                    });
                };
                if (disposition === 'attachment') {
                    attachments.push(makePart(partInfo, filename));
                    return true;
                }
                switch (type) {
                case 'image':
                    relatedParts.push(makePart(partInfo, filename));
                    return true;
                    break;
                case 'text':
                    if (subtype === 'plain' || subtype === 'html') {
                        bodyReps.push(makeTextPart(partInfo));
                        return true;
                    }
                    break;
                }
                return false;
            }
        }
        chewNode(msg.bodystructure);
        return {
            bodyReps: bodyReps,
            attachments: attachments,
            relatedParts: relatedParts
        };
    }
    ;
    function valuesOnly(item) {
        if (Array.isArray(item)) {
            return item.map(valuesOnly);
        } else if (item && typeof item === 'object') {
            if ('value' in item) {
                return item.value;
            } else {
                var result = {};
                for (var key in item) {
                    result[key] = valuesOnly(item[key]);
                }
                return result;
            }
        } else if (item && typeof item === 'object') {
            return item;
        } else if (item !== undefined) {
            return item;
        } else {
            return null;
        }
    }
    exports.chewHeaderAndBodyStructure = function (msg, folderId, newMsgId) {
        var parts = chewStructure(msg);
        msg.date = msg.internaldate && parseImapDateTime(msg.internaldate);
        msg.headers = {};
        for (var key in msg) {
            if (/header\.fields/.test(key)) {
                var headerParser = new MimeParser();
                headerParser.write(msg[key] + '\r\n');
                headerParser.end();
                msg.headers = headerParser.node.headers;
                break;
            }
        }
        var fromArray = valuesOnly(firstHeader(msg, 'from'));
        var references = valuesOnly(firstHeader(msg, 'references'));
        return {
            header: mailRep.makeHeaderInfo({
                id: newMsgId,
                srvid: msg.uid,
                suid: folderId + '/' + newMsgId,
                guid: stripArrows(valuesOnly(firstHeader(msg, 'message-id'))),
                author: fromArray && fromArray[0] || { address: 'missing-address@example.com' },
                to: valuesOnly(firstHeader(msg, 'to')),
                cc: valuesOnly(firstHeader(msg, 'cc')),
                bcc: valuesOnly(firstHeader(msg, 'bcc')),
                replyTo: valuesOnly(firstHeader(msg, 'reply-to')),
                date: msg.date,
                flags: msg.flags || [],
                hasAttachments: parts.attachments.length > 0,
                subject: valuesOnly(firstHeader(msg, 'subject')),
                snippet: null
            }),
            bodyInfo: mailRep.makeBodyInfo({
                date: msg.date,
                size: 0,
                attachments: parts.attachments,
                relatedParts: parts.relatedParts,
                references: references ? stripArrows(references.split(/\s+/)) : null,
                bodyReps: parts.bodyReps
            })
        };
    };
    exports.updateMessageWithFetch = function (header, body, req, res) {
        var bodyRep = body.bodyReps[req.bodyRepIndex];
        if (!req.bytes || res.bytesFetched < req.bytes[1]) {
            bodyRep.isDownloaded = true;
            bodyRep._partInfo = null;
        }
        if (!bodyRep.isDownloaded && res.buffer) {
            bodyRep._partInfo.pendingBuffer = res.buffer;
        }
        bodyRep.amountDownloaded += res.bytesFetched;
        var data = $mailchew.processMessageContent(res.text, bodyRep.type, bodyRep.isDownloaded, req.createSnippet);
        if (req.createSnippet) {
            header.snippet = data.snippet;
        }
        if (bodyRep.isDownloaded)
            bodyRep.content = data.content;
    };
    exports.selectSnippetBodyRep = function (header, body) {
        if (header.snippet)
            return -1;
        var bodyReps = body.bodyReps;
        var len = bodyReps.length;
        for (var i = 0; i < len; i++) {
            if (exports.canBodyRepFillSnippet(bodyReps[i])) {
                return i;
            }
        }
        return -1;
    };
    exports.canBodyRepFillSnippet = function (bodyRep) {
        return bodyRep && bodyRep.type === 'plain' || bodyRep.type === 'html';
    };
    exports.calculateBytesToDownloadForImapBodyDisplay = function (body) {
        var bytesLeft = 0;
        body.bodyReps.forEach(function (rep) {
            if (!rep.isDownloaded) {
                bytesLeft += rep.sizeEstimate - rep.amountDownloaded;
            }
        });
        body.relatedParts.forEach(function (part) {
            if (!part.file) {
                bytesLeft += part.sizeEstimate;
            }
        });
        return bytesLeft;
    };
    var reDateTime = /^( ?\d|\d{2})-(.{3})-(\d{4}) (\d{2}):(\d{2}):(\d{2})(?: ([+-]\d{4}))?$/;
    var HOUR_MILLIS = 60 * 60 * 1000;
    var MINUTE_MILLIS = 60 * 1000;
    var MONTHS = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec'
    ];
    var parseImapDateTime = exports.parseImapDateTime = function (dstr) {
        var match = reDateTime.exec(dstr);
        if (!match)
            throw new Error('Not a good IMAP date-time: ' + dstr);
        var day = parseInt(match[1], 10), zeroMonth = MONTHS.indexOf(match[2]), year = parseInt(match[3], 10), hours = parseInt(match[4], 10), minutes = parseInt(match[5], 10), seconds = parseInt(match[6], 10), timestamp = Date.UTC(year, zeroMonth, day, hours, minutes, seconds), zoneDelta = match[7] ? parseInt(match[7], 10) : 0, zoneHourDelta = Math.floor(zoneDelta / 100), zoneMinuteDelta = zoneDelta % 100;
        timestamp -= zoneHourDelta * HOUR_MILLIS + zoneMinuteDelta * MINUTE_MILLIS;
        return timestamp;
    };
    exports.formatImapDateTime = function (date) {
        var s;
        s = (date.getDate() < 10 ? ' ' : '') + date.getDate() + '-' + MONTHS[date.getMonth()] + '-' + date.getFullYear() + ' ' + ('0' + date.getHours()).slice(-2) + ':' + ('0' + date.getMinutes()).slice(-2) + ':' + ('0' + date.getSeconds()).slice(-2) + (date.getTimezoneOffset() > 0 ? ' -' : ' +') + ('0' + Math.abs(date.getTimezoneOffset()) / 60).slice(-2) + ('0' + Math.abs(date.getTimezoneOffset()) % 60).slice(-2);
        return s;
    };
});
;
define('pop3/mime_mapper', [], function () {
    return {
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
            'ogg': 'video/ogg',
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
});
define('pop3/pop3', [
    'module',
    'exports',
    'logic',
    'tcp-socket',
    'md5',
    './transport',
    'mimeparser',
    'imap/imapchew',
    'syncbase',
    'date',
    'mimefuncs',
    './mime_mapper',
    'allback'
], function (module, exports, logic, tcpSocket, md5, transport, MimeParser, imapchew, syncbase, dateMod, mimefuncs, mimeMapper, allback) {
    var setTimeout = window.setTimeout.bind(window);
    var clearTimeout = window.clearTimeout.bind(window);
    exports.setTimeoutFunctions = function (set, clear) {
        setTimeout = set;
        clearTimeout = clear;
    };
    var Pop3Client = exports.Pop3Client = function (options, cb) {
        this.options = options = options || {};
        options.host = options.host || null;
        options.username = options.username || null;
        options.password = options.password || null;
        options.port = options.port || null;
        options.crypto = options.crypto || false;
        options.connTimeout = options.connTimeout || 30000;
        options.debug = options.debug || false;
        options.authMethods = [
            'apop',
            'sasl',
            'user-pass'
        ];
        logic.defineScope(this, 'Pop3Client');
        if (options.preferredAuthMethod) {
            var idx = options.authMethods.indexOf(options.preferredAuthMethod);
            if (idx !== -1) {
                options.authMethods.splice(idx, 1);
            }
            options.authMethods.unshift(options.preferredAuthMethod);
        }
        if (options.crypto === true) {
            options.crypto = 'ssl';
        } else if (!options.crypto) {
            options.crypto = 'plain';
        }
        if (!options.port) {
            options.port = {
                'plain': 110,
                'starttls': 110,
                'ssl': 995
            }[options.crypto];
            if (!options.port) {
                throw new Error('Invalid crypto option for Pop3Client: ' + options.crypto);
            }
        }
        this.state = 'disconnected';
        this.authMethod = null;
        this.idToUidl = {};
        this.uidlToId = {};
        this.idToSize = {};
        this._messageList = null;
        this._greetingLine = null;
        this.protocol = new transport.Pop3Protocol();
        this.socket = tcpSocket.open(options.host, options.port, { useSecureTransport: options.crypto === 'ssl' || options.crypto === true });
        var connectTimeout = setTimeout(function () {
            this.state = 'disconnected';
            if (connectTimeout) {
                clearTimeout(connectTimeout);
                connectTimeout = null;
            }
            cb && cb({
                scope: 'connection',
                request: null,
                name: 'unresponsive-server',
                message: 'Could not connect to ' + options.host + ':' + options.port + ' with ' + options.crypto + ' encryption.'
            });
        }.bind(this), options.connTimeout);
        this.socket.ondata = this.protocol.onreceive.bind(this.protocol);
        this.protocol.onsend = this.socket.send.bind(this.socket);
        this.socket.onopen = function () {
            console.log('pop3:onopen');
            if (connectTimeout) {
                clearTimeout(connectTimeout);
                connectTimeout = null;
            }
            this.state = 'greeting';
        }.bind(this);
        this.socket.onerror = function (evt) {
            var err = evt && evt.data || evt;
            console.log('pop3:onerror', err);
            if (connectTimeout) {
                clearTimeout(connectTimeout);
                connectTimeout = null;
            }
            cb && cb({
                scope: 'connection',
                request: null,
                name: 'unresponsive-server',
                message: 'Socket exception: ' + JSON.stringify(err),
                exception: err
            });
        }.bind(this);
        this.onclose = null;
        this.socket.onclose = function () {
            console.log('pop3:onclose');
            this.protocol.onclose();
            this.close();
            if (this.onclose) {
                this.onclose();
            }
        }.bind(this);
        this.protocol.pendingRequests.push(new transport.Request(null, [], false, function (err, rsp) {
            if (err) {
                cb && cb({
                    scope: 'connection',
                    request: null,
                    name: 'unresponsive-server',
                    message: err.getStatusLine(),
                    response: err
                });
                return;
            }
            this._greetingLine = rsp.getLineAsString(0);
            this._maybeUpgradeConnection(function (err) {
                if (err) {
                    cb && cb(err);
                    return;
                }
                this._thenAuthorize(function (err) {
                    if (!err) {
                        this.state = 'ready';
                    }
                    cb && cb(err);
                });
            }.bind(this));
        }.bind(this)));
    };
    Pop3Client.prototype.close = Pop3Client.prototype.die = function () {
        if (this.state !== 'disconnected') {
            this.state = 'disconnected';
            this.socket.close();
        }
    };
    Pop3Client.prototype._getCapabilities = function (cb) {
        this.protocol.sendRequest('CAPA', [], true, function (err, rsp) {
            if (err) {
                this.capabilities = {};
            } else {
                var lines = rsp.getDataLines();
                for (var i = 0; i < lines.length; i++) {
                    var words = lines[i].split(' ');
                    this.capabilities[words[0]] = words.slice(1);
                }
            }
        }.bind(this));
    };
    Pop3Client.prototype._maybeUpgradeConnection = function (cb) {
        if (this.options.crypto === 'starttls') {
            this.state = 'starttls';
            this.protocol.sendRequest('STLS', [], false, function (err, rsp) {
                if (err) {
                    cb && cb({
                        scope: 'connection',
                        request: err.request,
                        name: 'bad-security',
                        message: err.getStatusLine(),
                        response: err
                    });
                    return;
                }
                this.socket.upgradeToSecure();
                cb();
            }.bind(this));
        } else {
            cb();
        }
    };
    Pop3Client.prototype._thenAuthorize = function (cb) {
        this.state = 'authorization';
        this.authMethod = this.options.authMethods.shift();
        var user = this.options.username;
        var pass = this.options.password;
        var secret;
        switch (this.authMethod) {
        case 'apop':
            var match = /<.*?>/.exec(this._greetingLine || '');
            var apopTimestamp = match && match[0];
            if (!apopTimestamp) {
                this._thenAuthorize(cb);
            } else {
                secret = md5(apopTimestamp + pass).toLowerCase();
                this.protocol.sendRequest('APOP', [
                    user,
                    secret
                ], false, function (err, rsp) {
                    if (err) {
                        this._greetingLine = null;
                        this._thenAuthorize(cb);
                    } else {
                        cb();
                    }
                }.bind(this));
            }
            break;
        case 'sasl':
            secret = btoa(user + '\0' + user + '\0' + pass);
            this.protocol.sendRequest('AUTH', [
                'PLAIN',
                secret
            ], false, function (err, rsp) {
                if (err) {
                    this._thenAuthorize(cb);
                } else {
                    cb();
                }
            }.bind(this));
            break;
        case 'user-pass':
        default:
            this.protocol.sendRequest('USER', [user], false, function (err, rsp) {
                if (err) {
                    cb && cb({
                        scope: 'authentication',
                        request: err.request,
                        name: 'bad-user-or-pass',
                        message: err.getStatusLine(),
                        response: err
                    });
                    return;
                }
                this.protocol.sendRequest('PASS', [pass], false, function (err, rsp) {
                    if (err) {
                        cb && cb({
                            scope: 'authentication',
                            request: null,
                            name: 'bad-user-or-pass',
                            message: err.getStatusLine(),
                            response: err
                        });
                        return;
                    }
                    cb();
                }.bind(this));
            }.bind(this));
            break;
        }
    };
    Pop3Client.prototype.quit = function (cb) {
        this.state = 'disconnected';
        this.protocol.sendRequest('QUIT', [], false, function (err, rsp) {
            this.close();
            if (err) {
                cb && cb({
                    scope: 'mailbox',
                    request: err.request,
                    name: 'server-problem',
                    message: err.getStatusLine(),
                    response: err
                });
            } else {
                cb && cb();
            }
        }.bind(this));
    };
    Pop3Client.prototype._loadMessageList = function (cb) {
        if (this._messageList) {
            cb(null, this._messageList);
            return;
        }
        this.protocol.sendRequest('UIDL', [], true, function (err, rsp) {
            if (err) {
                cb && cb({
                    scope: 'mailbox',
                    request: err.request,
                    name: 'server-problem',
                    message: err.getStatusLine(),
                    response: err
                });
                return;
            }
            var lines = rsp.getDataLines();
            for (var i = 0; i < lines.length; i++) {
                var words = lines[i].split(' ');
                var number = words[0];
                var uidl = words[1];
                this.idToUidl[number] = uidl;
                this.uidlToId[uidl] = number;
            }
        }.bind(this));
        this.protocol.sendRequest('LIST', [], true, function (err, rsp) {
            if (err) {
                cb && cb({
                    scope: 'mailbox',
                    request: err.request,
                    name: 'server-problem',
                    message: err.getStatusLine(),
                    response: err
                });
                return;
            }
            var lines = rsp.getDataLines();
            var allMessages = [];
            for (var i = 0; i < lines.length; i++) {
                var words = lines[i].split(' ');
                var number = words[0];
                var size = parseInt(words[1], 10);
                this.idToSize[number] = size;
                allMessages.unshift({
                    uidl: this.idToUidl[number],
                    size: size,
                    number: number
                });
            }
            this._messageList = allMessages;
            cb && cb(null, allMessages);
        }.bind(this));
    };
    Pop3Client.prototype.listMessages = function (opts, cb) {
        var filterFunc = opts.filter;
        var progressCb = opts.progress;
        var checkpointInterval = opts.checkpointInterval || null;
        var maxMessages = opts.maxMessages || Infinity;
        var checkpoint = opts.checkpoint;
        var overflowMessages = [];
        this._loadMessageList(function (err, unfilteredMessages) {
            if (err) {
                cb && cb(err);
                return;
            }
            var totalBytes = 0;
            var bytesFetched = 0;
            var messages = [];
            var seenCount = 0;
            for (var i = 0; i < unfilteredMessages.length; i++) {
                var msgInfo = unfilteredMessages[i];
                if (!filterFunc || filterFunc(msgInfo.uidl)) {
                    if (messages.length < maxMessages) {
                        totalBytes += msgInfo.size;
                        messages.push(msgInfo);
                    } else {
                        overflowMessages.push(msgInfo);
                    }
                } else {
                    seenCount++;
                }
            }
            console.log('POP3: listMessages found ' + messages.length + ' new, ' + overflowMessages.length + ' overflow, and ' + seenCount + ' seen messages. New UIDLs:');
            messages.forEach(function (m) {
                console.log('POP3: ' + m.size + ' bytes: ' + m.uidl);
            });
            var totalMessages = messages.length;
            if (!checkpointInterval) {
                checkpointInterval = totalMessages;
            }
            var firstErr = null;
            var nextBatch = function () {
                console.log('POP3: Next batch. Messages left: ' + messages.length);
                if (!messages.length || this.protocol.closed) {
                    console.log('POP3: Sync complete. ' + totalMessages + ' messages synced, ' + overflowMessages.length + ' overflow messages.');
                    cb && cb(firstErr, totalMessages, overflowMessages);
                    return;
                }
                var batch = messages.splice(0, checkpointInterval);
                var latch = allback.latch();
                batch.forEach(function (m, idx) {
                    var messageDone = latch.defer(m.number);
                    this.downloadPartialMessageByNumber(m.number, function (err, msg) {
                        bytesFetched += m.size;
                        if (err) {
                            if (!firstErr) {
                                firstErr = err;
                            }
                        } else {
                            progressCb && progressCb({
                                totalBytes: totalBytes,
                                bytesFetched: bytesFetched,
                                size: m.size,
                                message: msg
                            });
                        }
                        messageDone(err);
                    });
                }.bind(this));
                latch.then(function (results) {
                    var anySaved = false;
                    for (var num in results) {
                        console.log('result', num, results[num]);
                        if (!results[num][0]) {
                            anySaved = true;
                            break;
                        }
                    }
                    if (checkpoint && anySaved) {
                        console.log('POP3: Checkpoint.');
                        checkpoint(nextBatch);
                    } else {
                        nextBatch();
                    }
                });
            }.bind(this);
            nextBatch();
        }.bind(this));
    };
    Pop3Client.prototype.downloadMessageByUidl = function (uidl, cb) {
        this._loadMessageList(function (err) {
            if (err) {
                cb && cb(err);
            } else {
                this.downloadMessageByNumber(this.uidlToId[uidl], cb);
            }
        }.bind(this));
    };
    Pop3Client.prototype.downloadPartialMessageByNumber = function (number, cb) {
        var numLines = Math.floor(syncbase.POP3_SNIPPET_SIZE_GOAL / 80);
        this.protocol.sendRequest('TOP', [
            number,
            numLines
        ], true, function (err, rsp) {
            if (err) {
                cb && cb({
                    scope: 'message',
                    request: err.request,
                    name: 'server-problem',
                    message: err.getStatusLine(),
                    response: err
                });
                return;
            }
            var fullSize = this.idToSize[number];
            var data = rsp.getDataAsString();
            var isSnippet = !fullSize || data.length < fullSize;
            cb(null, this.parseMime(data, isSnippet, number));
        }.bind(this));
    };
    Pop3Client.prototype.downloadMessageByNumber = function (number, cb) {
        this.protocol.sendRequest('RETR', [number], true, function (err, rsp) {
            if (err) {
                cb && cb({
                    scope: 'message',
                    request: err.request,
                    name: 'server-problem',
                    message: err.getStatusLine(),
                    response: err
                });
                return;
            }
            cb(null, this.parseMime(rsp.getDataAsString(), false, number));
        }.bind(this));
    };
    function safeHeader(node, headerName, defaultValue) {
        var allHeaders = node.headers[headerName];
        if (allHeaders && allHeaders[0]) {
            return allHeaders[0].value;
        } else {
            return defaultValue || null;
        }
    }
    function safeHeaderParams(node, headerName) {
        var allHeaders = node.headers[headerName];
        if (allHeaders && allHeaders[0]) {
            return allHeaders[0].params || {};
        } else {
            return {};
        }
    }
    function mimeTreeToStructure(node, partId, partMap, partialNode) {
        var typeInfo = {};
        typeInfo.part = partId || '1';
        typeInfo.type = node.contentType.value;
        typeInfo.parameters = safeHeaderParams(node, 'content-type');
        var dispositionValue = safeHeader(node, 'content-disposition');
        if (dispositionValue) {
            typeInfo.disposition = dispositionValue;
            typeInfo.dispositionParameters = safeHeaderParams(node, 'content-disposition');
        }
        typeInfo.id = safeHeader(node, 'content-id');
        typeInfo.encoding = 'binary';
        typeInfo.size = node.content && node.content.length || 0;
        typeInfo.description = null;
        typeInfo.lines = null;
        typeInfo.md5 = null;
        typeInfo.childNodes = [];
        if (node.content == null && !/^multipart\//.test(typeInfo.type)) {
            node.content = new Uint8Array();
        }
        if (node.content != null) {
            partMap[typeInfo.part] = node.content;
            if (partialNode === node) {
                partMap['partial'] = typeInfo.part;
            }
        }
        if (node._childNodes.length) {
            for (var i = 0; i < node._childNodes.length; i++) {
                var child = node._childNodes[i];
                typeInfo.childNodes.push(mimeTreeToStructure(child, typeInfo.part + '.' + (i + 1), partMap, partialNode));
            }
        }
        return typeInfo;
    }
    Pop3Client.parseMime = function (content) {
        return Pop3Client.prototype.parseMime.call(this, content);
    };
    Pop3Client.prototype.parseMime = function (mimeContent, isSnippet, number) {
        var mp = new MimeParser();
        var lastNode;
        mp.write(mimefuncs.charset.encode(mimeContent, 'utf-8'));
        mp.end();
        lastNode = mp.node;
        while (lastNode._currentChild && lastNode !== lastNode._currentChild) {
            lastNode = lastNode._currentChild;
        }
        var rootNode = mp.node;
        var partialNode = isSnippet ? lastNode : null;
        var estSize = number && this.idToSize[number] || mimeContent.length;
        var content;
        var dateHeader = safeHeader(rootNode, 'date'), dateTS;
        var now = dateMod.NOW();
        if (dateHeader) {
            dateTS = Date.parse(dateHeader);
            if (isNaN(dateTS) || dateTS > now) {
                dateTS = now;
            }
        } else {
            dateTS = now;
        }
        var headerList = [];
        for (var key in rootNode.headers) {
            headerList.push(key + ': ' + rootNode.headers[key][0].initial + '\r\n');
        }
        var partMap = {};
        var msg = {
            uid: number && this.idToUidl[number],
            'header.fields[]': headerList.join(''),
            internaldate: dateTS && imapchew.formatImapDateTime(new Date(dateTS)),
            flags: [],
            bodystructure: mimeTreeToStructure(rootNode, '1', partMap, partialNode)
        };
        var rep = imapchew.chewHeaderAndBodyStructure(msg, null, null);
        var bodyRepIdx = imapchew.selectSnippetBodyRep(rep.header, rep.bodyInfo);
        var partSizes = {};
        var usedSize = 0;
        var partialPartKey = partMap['partial'];
        for (var k in partMap) {
            if (k === 'partial') {
                continue;
            }
            ;
            if (k !== partialPartKey) {
                usedSize += partMap[k].length;
                partSizes[k] = partMap[k].length;
            }
        }
        if (partialPartKey) {
            partSizes[partialPartKey] = estSize - usedSize;
        }
        for (var i = 0; i < rep.bodyInfo.bodyReps.length; i++) {
            var bodyRep = rep.bodyInfo.bodyReps[i];
            content = mimefuncs.charset.decode(partMap[bodyRep.part], 'utf-8');
            var req = {
                bytes: partialPartKey === bodyRep.part ? [
                    -1,
                    -1
                ] : null,
                bodyRepIndex: i,
                createSnippet: i === bodyRepIdx
            };
            if (content != null) {
                bodyRep.size = partSizes[bodyRep.part];
                var res = {
                    bytesFetched: content.length,
                    text: content
                };
                imapchew.updateMessageWithFetch(rep.header, rep.bodyInfo, req, res);
            }
        }
        for (var i = 0; i < rep.bodyInfo.relatedParts.length; i++) {
            var relatedPart = rep.bodyInfo.relatedParts[i];
            relatedPart.sizeEstimate = partSizes[relatedPart.part];
            content = partMap[relatedPart.part];
            if (content != null && partialPartKey !== relatedPart.part) {
                relatedPart.file = new Blob([content], { type: relatedPart.type });
            }
        }
        for (var i = 0; i < rep.bodyInfo.attachments.length; i++) {
            var att = rep.bodyInfo.attachments[i];
            content = partMap[att.part];
            att.sizeEstimate = partSizes[att.part];
            if (content != null && partialPartKey !== att.part && mimeMapper.isSupportedType(att.type)) {
                att.file = new Blob([content], { type: att.type });
            }
        }
        if (isSnippet && !rep.header.hasAttachments && (safeHeader(rootNode, 'x-ms-has-attach') || /multipart\/mixed/.test(rootNode.contentType.value) || estSize > syncbase.POP3_INFER_ATTACHMENTS_SIZE)) {
            rep.header.hasAttachments = true;
        }
        rep.bodyInfo.bodyReps.push({
            type: 'fake',
            part: 'fake',
            sizeEstimate: 0,
            amountDownloaded: 0,
            isDownloaded: !isSnippet,
            content: null,
            size: 0
        });
        rep.header.bytesToDownloadForBodyDisplay = isSnippet ? estSize : 0;
        return rep;
    };
    function bufferToPrintable(line) {
        var s = '';
        if (Array.isArray(line)) {
            line.forEach(function (l) {
                s += bufferToPrintable(l) + '\n';
            });
            return s;
        }
        for (var i = 0; i < line.length; i++) {
            var c = String.fromCharCode(line[i]);
            if (c === '\r') {
                s += '\\r';
            } else if (c === '\n') {
                s += '\\n';
            } else {
                s += c;
            }
        }
        return s;
    }
});
;
define('pop3/sync', [
    'logic',
    '../util',
    'module',
    'require',
    'exports',
    '../mailchew',
    '../syncbase',
    '../date',
    '../jobmixins',
    '../allback',
    './pop3'
], function (logic, util, module, require, exports, mailchew, sync, date, jobmixins, allback, pop3) {
    var PASTWARDS = 1;
    function Pop3FolderSyncer(account, storage) {
        this.account = account;
        this.storage = storage;
        logic.defineScope(this, 'Pop3FolderSyncer', {
            accountId: account.id,
            folderId: storage.folderId
        });
        this.isInbox = storage.folderMeta.type === 'inbox';
    }
    exports.Pop3FolderSyncer = Pop3FolderSyncer;
    function lazyWithConnection(getNew, cbIndex, whyLabel, fn) {
        return function pop3LazyWithConnection() {
            var args = Array.slice(arguments);
            require([], function () {
                var next = function () {
                    if (!this.isInbox) {
                        fn.apply(this, [null].concat(args));
                        return;
                    }
                    this.account.withConnection(function (err, conn, done) {
                        var callback = args[cbIndex];
                        if (err) {
                            callback && callback(err);
                        } else {
                            args[cbIndex] = function lazyDone(err) {
                                done();
                                callback && callback(err);
                            };
                            fn.apply(this, [conn].concat(args));
                        }
                    }.bind(this), whyLabel);
                }.bind(this);
                if (getNew && this.account._conn && this.account._conn.state !== 'disconnected') {
                    this.account._conn.quit(next);
                } else {
                    next();
                }
            }.bind(this));
        };
    }
    ;
    Pop3FolderSyncer.prototype = {
        syncable: true,
        get canGrowSync() {
            return this.isInbox;
        },
        downloadBodies: lazyWithConnection(false, 2, 'downloadBodies', function (conn, headers, options, callback) {
            var latch = allback.latch();
            var storage = this.storage;
            for (var i = 0; i < headers.length; i++) {
                if (headers[i] && headers[i].snippet == null) {
                    this.downloadBodyReps(headers[i], options, latch.defer(i));
                }
            }
            latch.then(function (results) {
                var err = null;
                for (var k in results) {
                    err = results[k][0];
                }
                callback(err, headers.length);
            });
        }),
        downloadBodyReps: lazyWithConnection(false, 2, 'downloadBodyReps', function (conn, header, options, callback) {
            if (options instanceof Function) {
                callback = options;
                options = {};
            }
            console.log('POP3: Downloading bodyReps for UIDL ' + header.srvid);
            conn.downloadMessageByUidl(header.srvid, function (err, message) {
                if (err) {
                    callback(err);
                    return;
                }
                header.bytesToDownloadForBodyDisplay = message.header.bytesToDownloadForBodyDisplay;
                console.log('POP3: Storing message ' + header.srvid + ' with ' + header.bytesToDownloadForBodyDisplay + ' bytesToDownload.');
                var flush = message.bodyInfo.attachments.length > 0;
                this.storeMessage(header, message.bodyInfo, { flush: flush }, function () {
                    callback && callback(null, message.bodyInfo, flush);
                });
            }.bind(this));
        }),
        downloadMessageAttachments: function (uid, partInfos, callback, progress) {
            console.log('POP3: ERROR: downloadMessageAttachments called and ' + 'POP3 shouldn\'t do that.');
            callback(null, null);
        },
        storeMessage: function (header, bodyInfo, options, callback) {
            callback = callback || function () {
            };
            var event = { changeDetails: {} };
            var knownId = this.getMessageIdForUidl(header.srvid);
            if (header.id == null) {
                if (knownId == null) {
                    header.id = this.storage._issueNewHeaderId();
                } else {
                    header.id = knownId;
                }
                header.suid = this.storage.folderId + '/' + header.id;
                header.guid = header.guid || header.srvid;
            }
            var latch = allback.latch();
            var self = this;
            for (var i = 0; i < bodyInfo.attachments.length; i++) {
                var att = bodyInfo.attachments[i];
                if (att.file instanceof Blob) {
                    console.log('Saving attachment', att.file);
                    var registerDownload = true;
                    jobmixins.saveToDeviceStorage(self, att.file, 'sdcard', registerDownload, att.name, att, latch.defer());
                }
            }
            latch.then(function () {
                latch = allback.latch();
                if (knownId == null) {
                    self.storeMessageUidlForMessageId(header.srvid, header.id);
                    self.storage.addMessageHeader(header, bodyInfo, latch.defer());
                    self.storage.addMessageBody(header, bodyInfo, latch.defer());
                } else {
                    self.storage.updateMessageHeader(header.date, header.id, true, header, bodyInfo, latch.defer());
                    event.changeDetails.attachments = range(bodyInfo.attachments.length);
                    event.changeDetails.bodyReps = range(bodyInfo.bodyReps.length);
                    var updateOptions = {};
                    if (options.flush) {
                        updateOptions.flushBecause = 'blobs';
                    }
                    self.storage.updateMessageBody(header, bodyInfo, updateOptions, event, latch.defer());
                }
                latch.then(function () {
                    callback(null, bodyInfo);
                });
            });
        },
        get inboxMeta() {
            return this.inboxMeta = this.account.getFolderMetaForFolderId(this.account.getFirstFolderWithType('inbox').id);
        },
        getMessageIdForUidl: function (uidl) {
            if (uidl == null) {
                return null;
            }
            this.inboxMeta.uidlMap = this.inboxMeta.uidlMap || {};
            return this.inboxMeta.uidlMap[uidl];
        },
        storeMessageUidlForMessageId: function (uidl, headerId) {
            this.inboxMeta.uidlMap = this.inboxMeta.uidlMap || {};
            this.inboxMeta.uidlMap[uidl] = headerId;
            if (this.inboxMeta.overflowMap) {
                delete this.inboxMeta.overflowMap[uidl];
            }
        },
        storeOverflowMessageUidl: function (uidl, size) {
            this.inboxMeta.overflowMap = this.inboxMeta.overflowMap || {};
            this.inboxMeta.overflowMap[uidl] = { size: size };
        },
        hasOverflowMessages: function () {
            if (!this.inboxMeta.overflowMap) {
                return false;
            }
            for (var key in this.inboxMeta.overflowMap) {
                return true;
            }
            return false;
        },
        isUidlInOverflowMap: function (uidl) {
            if (!this.inboxMeta.overflowMap) {
                return false;
            }
            return !!this.inboxMeta.overflowMap[uidl];
        },
        initialSync: function (slice, initialDays, syncCb, doneCb, progressCb) {
            syncCb('sync', true);
            this.sync('initial', slice, doneCb, progressCb);
        },
        refreshSync: function (slice, dir, startTS, endTS, origStartTS, doneCb, progressCb) {
            this.sync('refresh', slice, doneCb, progressCb);
        },
        _performTestAdditionsAndDeletions: function (cb) {
            var meta = this.storage.folderMeta;
            var numAdds = 0;
            var latch = allback.latch();
            var saveNeeded = false;
            if (meta._TEST_pendingHeaderDeletes) {
                meta._TEST_pendingHeaderDeletes.forEach(function (namer) {
                    saveNeeded = true;
                    this.storage.deleteMessageHeaderAndBody(namer.suid, namer.date, latch.defer());
                }, this);
                meta._TEST_pendingHeaderDeletes = null;
            }
            if (meta._TEST_pendingAdds) {
                meta._TEST_pendingAdds.forEach(function (msg) {
                    saveNeeded = true;
                    this.storeMessage(msg.header, msg.bodyInfo, {}, latch.defer());
                }, this);
                meta._TEST_pendingAdds = null;
            }
            latch.then(function (results) {
                cb();
            });
            return saveNeeded;
        },
        growSync: function (slice, growthDirection, anchorTS, syncStepDays, doneCallback, progressCallback) {
            if (growthDirection !== PASTWARDS || !this.hasOverflowMessages()) {
                return false;
            }
            this.sync('grow', slice, doneCallback, progressCallback);
            return true;
        },
        allConsumersDead: function () {
        },
        shutdown: function () {
        },
        sync: lazyWithConnection(true, 2, 'sync', function (conn, syncType, slice, realDoneCallback, progressCallback) {
            var self = this;
            logic(self, 'sync:begin', { syncType: syncType });
            var doneFired = false;
            var doneCallback = function (err) {
                if (doneFired) {
                    logic(self, 'sync:duplicateDone', {
                        syncType: syncType,
                        err: err
                    });
                    return;
                }
                logic(self, 'sync:end', {
                    syncType: syncType,
                    err: err
                });
                doneFired = true;
                realDoneCallback(err ? 'unknown' : null);
            };
            var filterFunc;
            if (syncType !== 'grow') {
                filterFunc = function (uidl) {
                    return self.getMessageIdForUidl(uidl) == null && !self.isUidlInOverflowMap(uidl);
                };
            } else {
                filterFunc = this.isUidlInOverflowMap.bind(this);
            }
            var bytesStored = 0;
            var numMessagesSynced = 0;
            var latch = allback.latch();
            var saveNeeded;
            if (!this.isInbox) {
                slice.desiredHeaders = this._TEST_pendingAdds && this._TEST_pendingAdds.length;
                saveNeeded = this._performTestAdditionsAndDeletions(latch.defer());
            } else {
                saveNeeded = true;
                logic(this, 'sync_begin');
                var fetchDoneCb = latch.defer();
                var closeExpected = false;
                conn.onclose = function () {
                    if (closeExpected) {
                        return;
                    }
                    closeExpected = true;
                    window.setTimeout(function () {
                        window.setTimeout(function () {
                            doneCallback('closed');
                        }, 0);
                    }, 0);
                };
                conn.listMessages({
                    filter: filterFunc,
                    checkpointInterval: sync.POP3_SAVE_STATE_EVERY_N_MESSAGES,
                    maxMessages: sync.POP3_MAX_MESSAGES_PER_SYNC,
                    checkpoint: function (next) {
                        this.account.__checkpointSyncCompleted(next, 'syncBatch');
                    }.bind(this),
                    progress: function fetchProgress(evt) {
                        var totalBytes = evt.totalBytes;
                        var message = evt.message;
                        var messageCb = latch.defer();
                        this.storeMessage(message.header, message.bodyInfo, {}, function () {
                            bytesStored += evt.size;
                            numMessagesSynced++;
                            progressCallback(0.1 + 0.7 * bytesStored / totalBytes);
                            messageCb();
                        });
                    }.bind(this)
                }, function fetchDone(err, numSynced, overflowMessages) {
                    closeExpected = true;
                    conn.quit();
                    if (err) {
                        doneCallback(err);
                        return;
                    }
                    if (overflowMessages.length) {
                        overflowMessages.forEach(function (message) {
                            this.storeOverflowMessageUidl(message.uidl, message.size);
                        }, this);
                        logic(this, 'overflowMessages', { count: overflowMessages.length });
                    }
                    fetchDoneCb();
                }.bind(this));
            }
            latch.then(function onSyncDone() {
                this.storage.markSyncRange(sync.OLDEST_SYNC_DATE + date.DAY_MILLIS + 1, date.NOW(), 'XXX', date.NOW());
                if (!this.hasOverflowMessages()) {
                    this.storage.markSyncedToDawnOfTime();
                }
                if (this.isInbox) {
                    logic(this, 'sync_end');
                }
                if (saveNeeded) {
                    this.account.__checkpointSyncCompleted(doDoneStuff, 'syncComplete');
                } else {
                    doDoneStuff();
                }
            }.bind(this));
            var doDoneStuff = function () {
                if (syncType === 'initial') {
                    this.storage._curSyncSlice.ignoreHeaders = false;
                    this.storage._curSyncSlice.waitingOnData = 'db';
                    this.storage.getMessagesInImapDateRange(sync.OLDEST_SYNC_DATE, null, sync.INITIAL_FILL_SIZE, sync.INITIAL_FILL_SIZE, this.storage.onFetchDBHeaders.bind(this.storage, this.storage._curSyncSlice, false, doneCallback, null));
                } else {
                    doneCallback(null);
                }
            }.bind(this);
        })
    };
    function range(end) {
        var ret = [];
        for (var i = 0; i < end; i++) {
            ret.push(i);
        }
        return ret;
    }
});
;
define('pop3/jobs', [
    'module',
    'exports',
    'logic',
    '../allback',
    'mix',
    '../jobmixins',
    '../drafts/jobs',
    './pop3'
], function (module, exports, logic, allback, mix, jobmixins, draftsJobs, pop3) {
    function Pop3JobDriver(account, state) {
        this.account = account;
        this.resilientServerIds = true;
        this._heldMutexReleasers = [];
        logic.defineScope(this, 'Pop3JobDriver', { accountId: account.id });
        this._stateDelta = {};
        this._state = state;
        if (!state.hasOwnProperty('suidToServerId')) {
            state.suidToServerId = {};
            state.moveMap = {};
        }
    }
    exports.Pop3JobDriver = Pop3JobDriver;
    Pop3JobDriver.prototype = {
        _accessFolderForMutation: function (folderId, needConn, callback, deathback, label) {
            var storage = this.account.getFolderStorageForFolderId(folderId);
            storage.runMutexed(label, function (releaseMutex) {
                this._heldMutexReleasers.push(releaseMutex);
                try {
                    callback(storage.folderSyncer, storage);
                } catch (ex) {
                    logic(this, 'callbackErr', { ex: ex });
                }
            }.bind(this));
        },
        local_do_createFolder: function (op, callback) {
            var path, delim, parentFolderId = null, depth = 0;
            if (op.parentFolderId) {
                if (!this.account._folderInfos.hasOwnProperty(op.parentFolderId)) {
                    throw new Error('No such folder: ' + op.parentFolderId);
                }
                var parentFolder = this.account._folderInfos[op.parentFolderId];
                delim = parentFolder.$meta.delim;
                path = parentFolder.$meta.path + delim;
                parentFolderId = parentFolder.$meta.id;
                depth = parentFolder.depth + 1;
            } else {
                path = '';
                delim = '/';
            }
            if (typeof op.folderName === 'string')
                path += op.folderName;
            else
                path += op.folderName.join(delim);
            if (op.containOnlyOtherFolders) {
                path += delim;
            }
            if (this.account.getFolderByPath(path)) {
                callback(null);
            } else {
                var folderMeta = self.account._learnAboutFolder(op.folderName, path, parentFolderId, 'normal', delim, depth);
                callback(null, folderMeta);
            }
        },
        local_do_purgeExcessMessages: function (op, callback) {
            this._accessFolderForMutation(op.folderId, false, function withMutex(_ignoredConn, storage) {
                storage.purgeExcessMessages(function (numDeleted, cutTS) {
                    callback(null, null, numDeleted > 0);
                });
            }, null, 'purgeExcessMessages');
        },
        local_do_saveSentDraft: function (op, callback) {
            var self = this;
            this._accessFolderForMutation(op.folderId, false, function (nullFolderConn, folderStorage) {
                var latch = allback.latch();
                folderStorage.addMessageHeader(op.headerInfo, op.bodyInfo, latch.defer());
                folderStorage.addMessageBody(op.headerInfo, op.bodyInfo, latch.defer());
                latch.then(function (results) {
                    callback(null, null, true);
                });
            }, null, 'saveSentDraft');
        },
        do_syncFolderList: function (op, doneCallback) {
            this.account.meta.lastFolderSyncAt = Date.now();
            doneCallback(null);
        },
        do_modtags: function (op, doneCallback) {
            doneCallback(null);
        },
        undo_modtags: function (op, doneCallback) {
            doneCallback(null);
        },
        local_do_modtags: jobmixins.local_do_modtags,
        local_undo_modtags: jobmixins.local_undo_modtags,
        local_do_move: jobmixins.local_do_move,
        local_undo_move: jobmixins.local_undo_move,
        local_do_delete: jobmixins.local_do_delete,
        local_undo_delete: jobmixins.local_undo_delete,
        local_do_downloadBodies: jobmixins.local_do_downloadBodies,
        do_downloadBodies: jobmixins.do_downloadBodies,
        check_downloadBodies: jobmixins.check_downloadBodies,
        check_downloadBodyReps: jobmixins.check_downloadBodyReps,
        do_downloadBodyReps: jobmixins.do_downloadBodyReps,
        local_do_downloadBodyReps: jobmixins.local_do_downloadBodyReps,
        local_do_sendOutboxMessages: jobmixins.local_do_sendOutboxMessages,
        do_sendOutboxMessages: jobmixins.do_sendOutboxMessages,
        check_sendOutboxMessages: jobmixins.check_sendOutboxMessages,
        local_undo_sendOutboxMessages: jobmixins.local_undo_sendOutboxMessages,
        undo_sendOutboxMessages: jobmixins.undo_sendOutboxMessages,
        local_do_setOutboxSyncEnabled: jobmixins.local_do_setOutboxSyncEnabled,
        local_do_upgradeDB: jobmixins.local_do_upgradeDB,
        postJobCleanup: jobmixins.postJobCleanup,
        allJobsDone: jobmixins.allJobsDone,
        _partitionAndAccessFoldersSequentially: jobmixins._partitionAndAccessFoldersSequentially
    };
    mix(Pop3JobDriver.prototype, draftsJobs.draftsMixins);
});
;
define('pop3/account', [
    'logic',
    '../errbackoff',
    '../composite/incoming',
    './sync',
    '../errorutils',
    './jobs',
    '../drafts/draft_rep',
    '../disaster-recovery',
    'module',
    'require',
    'exports'
], function (logic, errbackoff, incoming, pop3sync, errorutils, pop3jobs, draftRep, DisasterRecovery, module, require, exports) {
    var CompositeIncomingAccount = incoming.CompositeIncomingAccount;
    function Pop3Account(universe, compositeAccount, accountId, credentials, connInfo, folderInfos, dbConn, existingProtoConn) {
        logic.defineScope(this, 'Account', {
            accountId: accountId,
            accountType: 'pop3'
        });
        CompositeIncomingAccount.apply(this, [pop3sync.Pop3FolderSyncer].concat(Array.slice(arguments)));
        this._conn = null;
        this._pendingConnectionRequests = [];
        this._backoffEndpoint = errbackoff.createEndpoint('pop3:' + this.id, this);
        if (existingProtoConn) {
            DisasterRecovery.associateSocketWithAccount(existingProtoConn.socket, this);
            this._conn = existingProtoConn;
        }
        this.ensureEssentialOfflineFolders();
        this._jobDriver = new pop3jobs.Pop3JobDriver(this, this._folderInfos.$mutationState);
    }
    exports.Account = exports.Pop3Account = Pop3Account;
    Pop3Account.prototype = Object.create(CompositeIncomingAccount.prototype);
    var properties = {
        type: 'pop3',
        supportsServerFolders: false,
        toString: function () {
            return '[Pop3Account: ' + this.id + ']';
        },
        withConnection: function (cb, whyLabel) {
            this._pendingConnectionRequests.push(cb);
            var done = function () {
                var req = this._pendingConnectionRequests.shift();
                if (req) {
                    var next = function (err) {
                        if (err) {
                            req(err);
                            done();
                        } else {
                            req(null, this._conn, done);
                        }
                    }.bind(this);
                    if (!this._conn || this._conn.state === 'disconnected') {
                        this._makeConnection(next, whyLabel);
                    } else {
                        next();
                    }
                }
            }.bind(this);
            if (this._pendingConnectionRequests.length === 1) {
                done();
            }
        },
        __folderDoneWithConnection: function (conn) {
        },
        _makeConnection: function (callback, whyLabel) {
            this._conn = true;
            require([
                './pop3',
                './probe'
            ], function (pop3, pop3probe) {
                logic(this, 'createConnection', { label: whyLabel });
                var opts = {
                    host: this._connInfo.hostname,
                    port: this._connInfo.port,
                    crypto: this._connInfo.crypto,
                    preferredAuthMethod: this._connInfo.preferredAuthMethod,
                    username: this._credentials.username,
                    password: this._credentials.password
                };
                var conn = this._conn = new pop3.Pop3Client(opts, function (err) {
                    if (err) {
                        console.error('Connect error:', err.name, 'formal:', err, 'on', this._connInfo.hostname, this._connInfo.port);
                        err = pop3probe.normalizePop3Error(err);
                        if (errorutils.shouldReportProblem(err)) {
                            this.universe.__reportAccountProblem(this.compositeAccount, err, 'incoming');
                        }
                        callback && callback(err, null);
                        conn.close();
                        if (errorutils.shouldRetry(err)) {
                            if (this._backoffEndpoint.noteConnectFailureMaybeRetry(errorutils.wasErrorFromReachableState(err))) {
                                this._backoffEndpoint.scheduleConnectAttempt(this._makeConnection.bind(this));
                            } else {
                                this._backoffEndpoint.noteBrokenConnection();
                            }
                        } else {
                            this._backoffEndpoint.noteBrokenConnection();
                        }
                    } else {
                        this._backoffEndpoint.noteConnectSuccess();
                        callback && callback(null, conn);
                    }
                }.bind(this));
                DisasterRecovery.associateSocketWithAccount(conn.socket, this);
            }.bind(this));
        },
        saveSentMessage: function (composer) {
            var sentFolder = this.getFirstFolderWithType('sent');
            if (!sentFolder) {
                return;
            }
            var sentStorage = this.getFolderStorageForFolderId(sentFolder.id);
            var id = sentStorage._issueNewHeaderId();
            var suid = sentStorage.folderId + '/' + id;
            var sentPieces = draftRep.cloneDraftMessageForSentFolderWithoutAttachments(composer.header, composer.body, {
                id: id,
                suid: suid
            });
            this.universe.saveSentDraft(sentFolder.id, sentPieces.header, sentPieces.body);
        },
        deleteFolder: function (folderId, callback) {
            if (!this._folderInfos.hasOwnProperty(folderId)) {
                throw new Error('No such folder: ' + folderId);
            }
            var folderMeta = this._folderInfos[folderId].$meta;
            logic(self, 'deleteFolder', { path: folderMeta.path });
            self._forgetFolder(folderId);
            callback && callback(null, folderMeta);
        },
        shutdown: function (callback) {
            CompositeIncomingAccount.prototype.shutdownFolders.call(this);
            this._backoffEndpoint.shutdown();
            if (this._conn && this._conn.close) {
                this._conn.close();
            }
            callback && callback();
        },
        checkAccount: function (callback) {
            if (this._conn !== null) {
                if (this._conn.state !== 'disconnected') {
                    this._conn.close();
                }
                this._conn = null;
            }
            logic(this, 'checkAccount_begin');
            this.withConnection(function (err) {
                logic(this, 'checkAccount_end', { error: err });
                callback(err);
            }.bind(this), 'checkAccount');
        },
        ensureEssentialOfflineFolders: function () {
            [
                'sent',
                'localdrafts',
                'trash',
                'outbox'
            ].forEach(function (folderType) {
                if (!this.getFirstFolderWithType(folderType)) {
                    this._learnAboutFolder(folderType, folderType, null, folderType, '', 0, true);
                }
            }, this);
        },
        ensureEssentialOnlineFolders: function (callback) {
            callback && callback();
        },
        accountDeleted: function () {
            this._alive = false;
            this.shutdown();
        }
    };
    for (var k in properties) {
        Object.defineProperty(Pop3Account.prototype, k, Object.getOwnPropertyDescriptor(properties, k));
    }
});
;
define('axeshim-smtpclient', [
    'require',
    'logic'
], function (require) {
    var logic = require('logic');
    var scope = logic.scope('SmtpClient');
    return {
        debug: function (ignoredTag, msg) {
            if (!logic.isCensored) {
                logic(scope, 'debug', { msg: msg });
            }
        },
        log: function (ignoredTag, msg) {
            logic(scope, 'log', { msg: msg });
        },
        warn: function (ignoredTag, msg) {
            logic(scope, 'warn', { msg: msg });
        },
        error: function (ignoredTag, msg) {
            logic(scope, 'error', { msg: msg });
        }
    };
});
(function (root, factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define('ext/smtpclient/src/smtpclient-response-parser', factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.SmtpClientResponseParser = factory();
    }
}(this, function () {
    'use strict';
    var SmtpResponseParser = function () {
        this._remainder = '';
        this._block = {
            data: [],
            lines: [],
            statusCode: null
        };
        this.destroyed = false;
    };
    SmtpResponseParser.prototype.onerror = function () {
    };
    SmtpResponseParser.prototype.ondata = function () {
    };
    SmtpResponseParser.prototype.onend = function () {
    };
    SmtpResponseParser.prototype.send = function (chunk) {
        if (this.destroyed) {
            return this.onerror(new Error('This parser has already been closed, "write" is prohibited'));
        }
        var lines = (this._remainder + (chunk || '')).split(/\r?\n/);
        this._remainder = lines.pop();
        for (var i = 0, len = lines.length; i < len; i++) {
            this._processLine(lines[i]);
        }
    };
    SmtpResponseParser.prototype.end = function (chunk) {
        if (this.destroyed) {
            return this.onerror(new Error('This parser has already been closed, "end" is prohibited'));
        }
        if (chunk) {
            this.send(chunk);
        }
        if (this._remainder) {
            this._processLine(this._remainder);
        }
        this.destroyed = true;
        this.onend();
    };
    SmtpResponseParser.prototype._processLine = function (line) {
        var match, response;
        if (!line.trim()) {
            return;
        }
        this._block.lines.push(line);
        if (match = line.match(/^(\d{3})([\- ])(?:(\d+\.\d+\.\d+)(?: ))?(.*)/)) {
            this._block.data.push(match[4]);
            if (match[2] === '-') {
                if (this._block.statusCode && this._block.statusCode !== Number(match[1])) {
                    this.onerror('Invalid status code ' + match[1] + ' for multi line response (' + this._block.statusCode + ' expected)');
                } else if (!this._block.statusCode) {
                    this._block.statusCode = Number(match[1]);
                }
                return;
            } else {
                response = {
                    statusCode: Number(match[1]) || 0,
                    enhancedStatus: match[3] || null,
                    data: this._block.data.join('\n'),
                    line: this._block.lines.join('\n')
                };
                response.success = response.statusCode >= 200 && response.statusCode < 300;
                this.ondata(response);
                this._block = {
                    data: [],
                    lines: [],
                    statusCode: null
                };
                this._block.statusCode = null;
            }
        } else {
            this.onerror(new Error('Invalid SMTP response "' + line + '"'));
            this.ondata({
                success: false,
                statusCode: this._block.statusCode || null,
                enhancedStatus: null,
                data: [line].join('\n'),
                line: this._block.lines.join('\n')
            });
            this._block = {
                data: [],
                lines: [],
                statusCode: null
            };
        }
    };
    return SmtpResponseParser;
}));
(function (root, factory) {
    'use strict';
    var encoding;
    if (typeof define === 'function' && define.amd) {
        define('ext/smtpclient/src/smtpclient', [
            'tcp-socket',
            'stringencoding',
            'axe',
            './smtpclient-response-parser'
        ], function (TCPSocket, encoding, axe, SmtpClientResponseParser) {
            return factory(TCPSocket, encoding.TextEncoder, encoding.TextDecoder, axe, SmtpClientResponseParser, window.btoa);
        });
    } else if (typeof exports === 'object' && typeof navigator !== 'undefined') {
        encoding = require('wo-stringencoding');
        module.exports = factory(require('tcp-socket'), encoding.TextEncoder, encoding.TextDecoder, require('axe-logger'), require('./smtpclient-response-parser'), btoa);
    } else if (typeof exports === 'object') {
        encoding = require('wo-stringencoding');
        module.exports = factory(require('tcp-socket'), encoding.TextEncoder, encoding.TextDecoder, require('axe-logger'), require('./smtpclient-response-parser'), function (str) {
            var NodeBuffer = require('buffer').Buffer;
            return new NodeBuffer(str, 'binary').toString('base64');
        });
    } else {
        navigator.TCPSocket = navigator.TCPSocket || navigator.mozTCPSocket;
        root.SmtpClient = factory(navigator.TCPSocket, root.TextEncoder, root.TextDecoder, root.axe, root.SmtpClientResponseParser, window.btoa);
    }
}(this, function (TCPSocket, TextEncoder, TextDecoder, axe, SmtpClientResponseParser, btoa) {
    'use strict';
    var DEBUG_TAG = 'SMTP Client';
    function SmtpClient(host, port, options) {
        this._TCPSocket = TCPSocket;
        this.options = options || {};
        this.port = port || (this.options.useSecureTransport ? 465 : 25);
        this.host = host || 'localhost';
        this.options.useSecureTransport = 'useSecureTransport' in this.options ? !!this.options.useSecureTransport : this.port === 465;
        this.options.auth = this.options.auth || false;
        this.options.name = this.options.name || false;
        this.socket = false;
        this.destroyed = false;
        this.maxAllowedSize = 0;
        this.waitDrain = false;
        this._parser = new SmtpClientResponseParser();
        this._authenticatedAs = null;
        this._supportedAuth = [];
        this._dataMode = false;
        this._lastDataBytes = '';
        this._envelope = null;
        this._currentAction = null;
        this._secureMode = !!this.options.useSecureTransport;
    }
    SmtpClient.prototype.onerror = function () {
    };
    SmtpClient.prototype.ondrain = function () {
    };
    SmtpClient.prototype.onclose = function () {
    };
    SmtpClient.prototype.onidle = function () {
    };
    SmtpClient.prototype.onready = function () {
    };
    SmtpClient.prototype.ondone = function () {
    };
    SmtpClient.prototype.connect = function () {
        if (!this.options.name && 'getHostname' in this._TCPSocket && typeof this._TCPSocket.getHostname === 'function') {
            this._TCPSocket.getHostname(function (err, hostname) {
                this.options.name = hostname || 'localhost';
                this.connect();
            }.bind(this));
            return;
        } else if (!this.options.name) {
            this.options.name = 'localhost';
        }
        this.socket = this._TCPSocket.open(this.host, this.port, {
            binaryType: 'arraybuffer',
            useSecureTransport: this._secureMode,
            ca: this.options.ca,
            tlsWorkerPath: this.options.tlsWorkerPath
        });
        try {
            this.socket.oncert = this.oncert;
        } catch (E) {
        }
        this.socket.onerror = this._onError.bind(this);
        this.socket.onopen = this._onOpen.bind(this);
    };
    SmtpClient.prototype.suspend = function () {
        if (this.socket && this.socket.readyState === 'open') {
            this.socket.suspend();
        }
    };
    SmtpClient.prototype.resume = function () {
        if (this.socket && this.socket.readyState === 'open') {
            this.socket.resume();
        }
    };
    SmtpClient.prototype.quit = function () {
        axe.debug(DEBUG_TAG, 'Sending QUIT...');
        this._sendCommand('QUIT');
        this._currentAction = this.close;
    };
    SmtpClient.prototype.reset = function (auth) {
        this.options.auth = auth || this.options.auth;
        axe.debug(DEBUG_TAG, 'Sending RSET...');
        this._sendCommand('RSET');
        this._currentAction = this._actionRSET;
    };
    SmtpClient.prototype.close = function () {
        axe.debug(DEBUG_TAG, 'Closing connection...');
        if (this.socket && this.socket.readyState === 'open') {
            this.socket.close();
        } else {
            this._destroy();
        }
    };
    SmtpClient.prototype.useEnvelope = function (envelope) {
        this._envelope = envelope || {};
        this._envelope.from = [].concat(this._envelope.from || 'anonymous@' + this.options.name)[0];
        this._envelope.to = [].concat(this._envelope.to || []);
        this._envelope.rcptQueue = [].concat(this._envelope.to);
        this._envelope.rcptFailed = [];
        this._envelope.responseQueue = [];
        this._currentAction = this._actionMAIL;
        axe.debug(DEBUG_TAG, 'Sending MAIL FROM...');
        this._sendCommand('MAIL FROM:<' + this._envelope.from + '>');
    };
    SmtpClient.prototype.send = function (chunk) {
        if (!this._dataMode) {
            return true;
        }
        return this._sendString(chunk);
    };
    SmtpClient.prototype.end = function (chunk) {
        if (!this._dataMode) {
            return true;
        }
        if (chunk && chunk.length) {
            this.send(chunk);
        }
        this._currentAction = this._actionStream;
        if (this._lastDataBytes === '\r\n') {
            this.waitDrain = this.socket.send(new Uint8Array([
                46,
                13,
                10
            ]).buffer);
        } else if (this._lastDataBytes.substr(-1) === '\r') {
            this.waitDrain = this.socket.send(new Uint8Array([
                10,
                46,
                13,
                10
            ]).buffer);
        } else {
            this.waitDrain = this.socket.send(new Uint8Array([
                13,
                10,
                46,
                13,
                10
            ]).buffer);
        }
        this._dataMode = false;
        return this.waitDrain;
    };
    SmtpClient.prototype._onOpen = function () {
        this.socket.ondata = this._onData.bind(this);
        this.socket.onclose = this._onClose.bind(this);
        this.socket.ondrain = this._onDrain.bind(this);
        this._parser.ondata = this._onCommand.bind(this);
        this._currentAction = this._actionGreeting;
    };
    SmtpClient.prototype._onData = function (evt) {
        var stringPayload = new TextDecoder('UTF-8').decode(new Uint8Array(evt.data));
        axe.debug(DEBUG_TAG, 'SERVER: ' + stringPayload);
        this._parser.send(stringPayload);
    };
    SmtpClient.prototype._onDrain = function () {
        this.waitDrain = false;
        this.ondrain();
    };
    SmtpClient.prototype._onError = function (evt) {
        if (evt instanceof Error && evt.message) {
            axe.error(DEBUG_TAG, evt);
            this.onerror(evt);
        } else if (evt && evt.data instanceof Error) {
            axe.error(DEBUG_TAG, evt.data);
            this.onerror(evt.data);
        } else {
            axe.error(DEBUG_TAG, new Error(evt && evt.data && evt.data.message || evt.data || evt || 'Error'));
            this.onerror(new Error(evt && evt.data && evt.data.message || evt.data || evt || 'Error'));
        }
        this.close();
    };
    SmtpClient.prototype._onClose = function () {
        axe.debug(DEBUG_TAG, 'Socket closed.');
        this._destroy();
    };
    SmtpClient.prototype._onCommand = function (command) {
        if (typeof this._currentAction === 'function') {
            this._currentAction.call(this, command);
        }
    };
    SmtpClient.prototype._destroy = function () {
        if (!this.destroyed) {
            this.destroyed = true;
            this.onclose();
        }
    };
    SmtpClient.prototype._sendString = function (chunk) {
        if (!this.options.disableEscaping) {
            chunk = chunk.replace(/\n\./g, '\n..');
            if ((this._lastDataBytes.substr(-1) === '\n' || !this._lastDataBytes) && chunk.charAt(0) === '.') {
                chunk = '.' + chunk;
            }
        }
        if (chunk.length > 2) {
            this._lastDataBytes = chunk.substr(-2);
        } else if (chunk.length === 1) {
            this._lastDataBytes = this._lastDataBytes.substr(-1) + chunk;
        }
        axe.debug(DEBUG_TAG, 'Sending ' + chunk.length + ' bytes of payload');
        this.waitDrain = this.socket.send(new TextEncoder('UTF-8').encode(chunk).buffer);
        return this.waitDrain;
    };
    SmtpClient.prototype._sendCommand = function (str) {
        this.waitDrain = this.socket.send(new TextEncoder('UTF-8').encode(str + (str.substr(-2) !== '\r\n' ? '\r\n' : '')).buffer);
    };
    SmtpClient.prototype._authenticateUser = function () {
        if (!this.options.auth) {
            this._currentAction = this._actionIdle;
            this.onidle();
            return;
        }
        var auth;
        if (!this.options.authMethod && this.options.auth.xoauth2) {
            this.options.authMethod = 'XOAUTH2';
        }
        if (this.options.authMethod) {
            auth = this.options.authMethod.toUpperCase().trim();
        } else {
            auth = (this._supportedAuth[0] || 'PLAIN').toUpperCase().trim();
        }
        switch (auth) {
        case 'LOGIN':
            axe.debug(DEBUG_TAG, 'Authentication via AUTH LOGIN');
            this._currentAction = this._actionAUTH_LOGIN_USER;
            this._sendCommand('AUTH LOGIN');
            return;
        case 'PLAIN':
            axe.debug(DEBUG_TAG, 'Authentication via AUTH PLAIN');
            this._currentAction = this._actionAUTHComplete;
            this._sendCommand('AUTH PLAIN ' + btoa(unescape(encodeURIComponent('\0' + this.options.auth.user + '\0' + this.options.auth.pass))));
            return;
        case 'XOAUTH2':
            axe.debug(DEBUG_TAG, 'Authentication via AUTH XOAUTH2');
            this._currentAction = this._actionAUTH_XOAUTH2;
            this._sendCommand('AUTH XOAUTH2 ' + this._buildXOAuth2Token(this.options.auth.user, this.options.auth.xoauth2));
            return;
        }
        this._onError(new Error('Unknown authentication method ' + auth));
    };
    SmtpClient.prototype._actionGreeting = function (command) {
        if (command.statusCode !== 220) {
            this._onError(new Error('Invalid greeting: ' + command.data));
            return;
        }
        if (this.options.lmtp) {
            axe.debug(DEBUG_TAG, 'Sending LHLO ' + this.options.name);
            this._currentAction = this._actionLHLO;
            this._sendCommand('LHLO ' + this.options.name);
        } else {
            axe.debug(DEBUG_TAG, 'Sending EHLO ' + this.options.name);
            this._currentAction = this._actionEHLO;
            this._sendCommand('EHLO ' + this.options.name);
        }
    };
    SmtpClient.prototype._actionLHLO = function (command) {
        if (!command.success) {
            axe.error(DEBUG_TAG, 'LHLO not successful');
            this._onError(new Error(command.data));
            return;
        }
        this._actionEHLO(command);
    };
    SmtpClient.prototype._actionEHLO = function (command) {
        var match;
        if (!command.success) {
            if (!this._secureMode && this.options.requireTLS) {
                var errMsg = 'STARTTLS not supported without EHLO';
                axe.error(DEBUG_TAG, errMsg);
                this._onError(new Error(errMsg));
                return;
            }
            axe.warn(DEBUG_TAG, 'EHLO not successful, trying HELO ' + this.options.name);
            this._currentAction = this._actionHELO;
            this._sendCommand('HELO ' + this.options.name);
            return;
        }
        if (command.line.match(/AUTH(?:\s+[^\n]*\s+|\s+)PLAIN/i)) {
            axe.debug(DEBUG_TAG, 'Server supports AUTH PLAIN');
            this._supportedAuth.push('PLAIN');
        }
        if (command.line.match(/AUTH(?:\s+[^\n]*\s+|\s+)LOGIN/i)) {
            axe.debug(DEBUG_TAG, 'Server supports AUTH LOGIN');
            this._supportedAuth.push('LOGIN');
        }
        if (command.line.match(/AUTH(?:\s+[^\n]*\s+|\s+)XOAUTH2/i)) {
            axe.debug(DEBUG_TAG, 'Server supports AUTH XOAUTH2');
            this._supportedAuth.push('XOAUTH2');
        }
        if ((match = command.line.match(/SIZE (\d+)/i)) && Number(match[1])) {
            this._maxAllowedSize = Number(match[1]);
            axe.debug(DEBUG_TAG, 'Maximum allowd message size: ' + this._maxAllowedSize);
        }
        if (!this._secureMode) {
            if (command.line.match(/[ \-]STARTTLS\s?$/im) && !this.options.ignoreTLS || !!this.options.requireTLS) {
                this._currentAction = this._actionSTARTTLS;
                this._sendCommand('STARTTLS');
                return;
            }
        }
        this._authenticateUser.call(this);
    };
    SmtpClient.prototype._actionSTARTTLS = function (command) {
        if (!command.success) {
            axe.error(DEBUG_TAG, 'STARTTLS not successful');
            this._onError(new Error(command.data));
            return;
        }
        this._secureMode = true;
        this.socket.upgradeToSecure();
        this._currentAction = this._actionEHLO;
        this._sendCommand('EHLO ' + this.options.name);
    };
    SmtpClient.prototype._actionHELO = function (command) {
        if (!command.success) {
            axe.error(DEBUG_TAG, 'HELO not successful');
            this._onError(new Error(command.data));
            return;
        }
        this._authenticateUser.call(this);
    };
    SmtpClient.prototype._actionAUTH_LOGIN_USER = function (command) {
        if (command.statusCode !== 334 || command.data !== 'VXNlcm5hbWU6') {
            axe.error(DEBUG_TAG, 'AUTH LOGIN USER not successful: ' + command.data);
            this._onError(new Error('Invalid login sequence while waiting for "334 VXNlcm5hbWU6 ": ' + command.data));
            return;
        }
        axe.debug(DEBUG_TAG, 'AUTH LOGIN USER successful');
        this._currentAction = this._actionAUTH_LOGIN_PASS;
        this._sendCommand(btoa(unescape(encodeURIComponent(this.options.auth.user))));
    };
    SmtpClient.prototype._actionAUTH_LOGIN_PASS = function (command) {
        if (command.statusCode !== 334 || command.data !== 'UGFzc3dvcmQ6') {
            axe.error(DEBUG_TAG, 'AUTH LOGIN PASS not successful: ' + command.data);
            this._onError(new Error('Invalid login sequence while waiting for "334 UGFzc3dvcmQ6 ": ' + command.data));
            return;
        }
        axe.debug(DEBUG_TAG, 'AUTH LOGIN PASS successful');
        this._currentAction = this._actionAUTHComplete;
        this._sendCommand(btoa(unescape(encodeURIComponent(this.options.auth.pass))));
    };
    SmtpClient.prototype._actionAUTH_XOAUTH2 = function (command) {
        if (!command.success) {
            axe.warn(DEBUG_TAG, 'Error during AUTH XOAUTH2, sending empty response');
            this._sendCommand('');
            this._currentAction = this._actionAUTHComplete;
        } else {
            this._actionAUTHComplete(command);
        }
    };
    SmtpClient.prototype._actionAUTHComplete = function (command) {
        if (!command.success) {
            axe.debug(DEBUG_TAG, 'Authentication failed: ' + command.data);
            this._onError(new Error(command.data));
            return;
        }
        axe.debug(DEBUG_TAG, 'Authentication successful.');
        this._authenticatedAs = this.options.auth.user;
        this._currentAction = this._actionIdle;
        this.onidle();
    };
    SmtpClient.prototype._actionIdle = function (command) {
        if (command.statusCode > 300) {
            this._onError(new Error(command.line));
            return;
        }
        this._onError(new Error(command.data));
    };
    SmtpClient.prototype._actionMAIL = function (command) {
        if (!command.success) {
            axe.debug(DEBUG_TAG, 'MAIL FROM unsuccessful: ' + command.data);
            this._onError(new Error(command.data));
            return;
        }
        if (!this._envelope.rcptQueue.length) {
            this._onError(new Error('Can\'t send mail - no recipients defined'));
        } else {
            axe.debug(DEBUG_TAG, 'MAIL FROM successful, proceeding with ' + this._envelope.rcptQueue.length + ' recipients');
            axe.debug(DEBUG_TAG, 'Adding recipient...');
            this._envelope.curRecipient = this._envelope.rcptQueue.shift();
            this._currentAction = this._actionRCPT;
            this._sendCommand('RCPT TO:<' + this._envelope.curRecipient + '>');
        }
    };
    SmtpClient.prototype._actionRCPT = function (command) {
        if (!command.success) {
            axe.warn(DEBUG_TAG, 'RCPT TO failed for: ' + this._envelope.curRecipient);
            this._envelope.rcptFailed.push(this._envelope.curRecipient);
        } else {
            this._envelope.responseQueue.push(this._envelope.curRecipient);
        }
        if (!this._envelope.rcptQueue.length) {
            if (this._envelope.rcptFailed.length < this._envelope.to.length) {
                this._currentAction = this._actionDATA;
                axe.debug(DEBUG_TAG, 'RCPT TO done, proceeding with payload');
                this._sendCommand('DATA');
            } else {
                this._onError(new Error('Can\'t send mail - all recipients were rejected'));
                this._currentAction = this._actionIdle;
                return;
            }
        } else {
            axe.debug(DEBUG_TAG, 'Adding recipient...');
            this._envelope.curRecipient = this._envelope.rcptQueue.shift();
            this._currentAction = this._actionRCPT;
            this._sendCommand('RCPT TO:<' + this._envelope.curRecipient + '>');
        }
    };
    SmtpClient.prototype._actionRSET = function (command) {
        if (!command.success) {
            axe.error(DEBUG_TAG, 'RSET unsuccessful ' + command.data);
            this._onError(new Error(command.data));
            return;
        }
        this._authenticatedAs = null;
        this._authenticateUser.call(this);
    };
    SmtpClient.prototype._actionDATA = function (command) {
        if ([
                250,
                354
            ].indexOf(command.statusCode) < 0) {
            axe.error(DEBUG_TAG, 'DATA unsuccessful ' + command.data);
            this._onError(new Error(command.data));
            return;
        }
        this._dataMode = true;
        this._currentAction = this._actionIdle;
        this.onready(this._envelope.rcptFailed);
    };
    SmtpClient.prototype._actionStream = function (command) {
        var rcpt;
        if (this.options.lmtp) {
            rcpt = this._envelope.responseQueue.shift();
            if (!command.success) {
                axe.error(DEBUG_TAG, 'Local delivery to ' + rcpt + ' failed.');
                this._envelope.rcptFailed.push(rcpt);
            } else {
                axe.error(DEBUG_TAG, 'Local delivery to ' + rcpt + ' succeeded.');
            }
            if (this._envelope.responseQueue.length) {
                this._currentAction = this._actionStream;
                return;
            }
            this._currentAction = this._actionIdle;
            this.ondone(true);
        } else {
            if (!command.success) {
                axe.error(DEBUG_TAG, 'Message sending failed.');
            } else {
                axe.debug(DEBUG_TAG, 'Message sent successfully.');
            }
            this._currentAction = this._actionIdle;
            this.ondone(!!command.success);
        }
        if (this._currentAction === this._actionIdle) {
            axe.debug(DEBUG_TAG, 'Idling while waiting for new connections...');
            this.onidle();
        }
    };
    SmtpClient.prototype._buildXOAuth2Token = function (user, token) {
        var authData = [
            'user=' + (user || ''),
            'auth=Bearer ' + token,
            '',
            ''
        ];
        return btoa(unescape(encodeURIComponent(authData.join('\x01'))));
    };
    return SmtpClient;
}));
define('smtpclient', ['ext/smtpclient/src/smtpclient'], function (SmtpClient) {
    return SmtpClient;
});
define('smtp/client', [
    'require',
    'exports',
    'module',
    'logic',
    'smtpclient',
    '../syncbase',
    '../oauth'
], function (require, exports) {
    var logic = require('logic');
    var SmtpClient = require('smtpclient');
    var syncbase = require('../syncbase');
    var oauth = require('../oauth');
    var setTimeout = window.setTimeout;
    var clearTimeout = window.clearTimeout;
    exports.setTimeoutFunctions = function (setFn, clearFn) {
        setTimeout = setFn;
        clearTimeout = clearFn;
    };
    var scope = logic.scope('SmtpClient');
    exports.createSmtpConnection = function (credentials, connInfo, credsUpdatedCallback) {
        var conn;
        return oauth.ensureUpdatedCredentials(credentials, credsUpdatedCallback).then(function () {
            return new Promise(function (resolve, reject) {
                var auth = {
                    user: credentials.outgoingUsername !== undefined ? credentials.outgoingUsername : credentials.username,
                    pass: credentials.outgoingPassword !== undefined ? credentials.outgoingPassword : credentials.password,
                    xoauth2: credentials.oauth2 ? credentials.oauth2.accessToken : null
                };
                logic(scope, 'connect', {
                    _auth: auth,
                    usingOauth2: !!credentials.oauth2,
                    connInfo: connInfo
                });
                conn = new SmtpClient(connInfo.hostname, connInfo.port, {
                    auth: auth,
                    useSecureTransport: connInfo.crypto === 'ssl' || connInfo.crypto === true,
                    requireTLS: connInfo.crypto === 'starttls',
                    ignoreTLS: connInfo.crypto === 'plain'
                });
                var connectTimeout = setTimeout(function () {
                    conn.onerror('unresponsive-server');
                    conn.close();
                }, syncbase.CONNECT_TIMEOUT_MS);
                function clearConnectTimeout() {
                    if (connectTimeout) {
                        clearTimeout(connectTimeout);
                        connectTimeout = null;
                    }
                }
                conn.onidle = function () {
                    clearConnectTimeout();
                    logic(scope, 'connected', connInfo);
                    conn.onidle = conn.onclose = conn.onerror = function () {
                    };
                    resolve(conn);
                };
                conn.onerror = function (err) {
                    clearConnectTimeout();
                    reject(err);
                };
                conn.onclose = function () {
                    clearConnectTimeout();
                    reject('server-maybe-offline');
                };
                conn.connect();
            });
        }).catch(function (err) {
            var errorString = analyzeSmtpError(conn, err, false);
            if (conn) {
                conn.close();
            }
            if (errorString === 'needs-oauth-reauth' && oauth.isRenewPossible(credentials)) {
                return oauth.ensureUpdatedCredentials(credentials, credsUpdatedCallback, true).then(function () {
                    return exports.createImapConnection(credentials, connInfo, credsUpdatedCallback);
                });
            } else {
                logic(scope, 'connect-error', {
                    error: errorString,
                    connInfo: connInfo
                });
                throw errorString;
            }
        });
    };
    var onCommand = SmtpClient.prototype._onCommand;
    SmtpClient.prototype._onCommand = function (command) {
        if (command.statusCode && !command.success) {
            this._lastSmtpError = command;
        }
        onCommand.apply(this, arguments);
    };
    SmtpClient.prototype._onError = function (evt) {
        if (evt instanceof Error && evt.message) {
            this.onerror(evt);
        } else if (evt && evt.data instanceof Error) {
            this.onerror(evt.data);
        } else {
            this.onerror(evt && evt.data && evt.data.message || evt.data || evt || 'Error');
        }
        this.close();
    };
    var analyzeSmtpError = exports.analyzeSmtpError = function (conn, rawError, wasSending) {
        var err = rawError;
        if (err && !err.statusCode && err.name === 'Error' || !err) {
            err = conn && conn._lastSmtpError || null;
        }
        if (!err) {
            err = 'null-error';
        }
        var wasOauth = conn && !!conn.options.auth.xoauth2;
        var normalizedError = 'unknown';
        if (err.statusCode) {
            if (conn._currentAction === conn._actionSTARTTLS || conn._currentAction === conn._actionEHLO) {
                normalizedError = 'bad-security';
            } else {
                switch (err.statusCode) {
                case 535:
                    if (wasOauth) {
                        normalizedError = 'needs-oauth-reauth';
                    } else {
                        normalizedError = 'bad-user-or-pass';
                    }
                    break;
                case 534:
                    normalizedError = 'bad-user-or-pass';
                    break;
                case 501:
                    if (wasSending) {
                        normalizedError = 'bad-message';
                    } else {
                        normalizedError = 'server-maybe-offline';
                    }
                    break;
                case 550:
                case 551:
                case 553:
                case 554:
                    normalizedError = 'bad-address';
                    break;
                case 500:
                    normalizedError = 'server-problem';
                    break;
                default:
                    if (wasSending) {
                        normalizedError = 'bad-message';
                    } else {
                        normalizedError = 'unknown';
                    }
                    break;
                }
            }
        } else if (err.name === 'ConnectionRefusedError') {
            normalizedError = 'unresponsive-server';
        } else if (/^Security/.test(err.name)) {
            normalizedError = 'bad-security';
        } else if (typeof err === 'string') {
            normalizedError = err;
        }
        logic(scope, 'analyzed-error', {
            statusCode: err.statusCode,
            enhancedStatus: err.enhancedStatus,
            rawError: rawError,
            rawErrorName: rawError && rawError.name,
            rawErrorMessage: rawError && rawError.message,
            rawErrorStack: rawError && rawError.stack,
            normalizedError: normalizedError,
            errorName: err.name,
            errorMessage: err.message,
            errorData: err.data,
            wasSending: wasSending
        });
        return normalizedError;
    };
});
define('smtp/account', [
    'require',
    'logic',
    './client',
    '../disaster-recovery'
], function (require) {
    var logic = require('logic');
    var client = require('./client');
    var DisasterRecovery = require('../disaster-recovery');
    function SmtpAccount(universe, compositeAccount, accountId, credentials, connInfo) {
        this.universe = universe;
        logic.defineScope(this, 'Account', {
            accountId: accountId,
            accountType: 'smtp'
        });
        this.compositeAccount = compositeAccount;
        this.accountId = accountId;
        this.credentials = credentials;
        this.connInfo = connInfo;
        this._activeConnections = [];
    }
    SmtpAccount.prototype = {
        type: 'smtp',
        toString: function () {
            return '[SmtpAccount: ' + this.id + ']';
        },
        get numActiveConns() {
            return this._activeConnections.length;
        },
        shutdown: function () {
        },
        accountDeleted: function () {
            this.shutdown();
        },
        sendMessage: function (composer, callback) {
            var scope = this;
            this.establishConnection({
                sendEnvelope: function (conn) {
                    var envelope = composer.getEnvelope();
                    logic(scope, 'sendEnvelope', { _envelope: envelope });
                    conn.useEnvelope(envelope);
                },
                onProgress: function () {
                    composer.renewSmartWakeLock('SMTP XHR Progress');
                },
                sendMessage: function (conn) {
                    logic(scope, 'building-blob');
                    composer.withMessageBlob({
                        includeBcc: false,
                        smtp: true
                    }, function (blob) {
                        logic(scope, 'sending-blob', { size: blob.size });
                        conn.socket.send(blob);
                        conn._lastDataBytes = '\r\n';
                        conn.end();
                    });
                },
                onSendComplete: function (conn) {
                    logic(scope, 'smtp:sent');
                    callback(null);
                },
                onError: function (err, badAddresses) {
                    logic(scope, 'smtp:error', {
                        error: err,
                        badAddresses: badAddresses
                    });
                    callback(err, badAddresses);
                }
            });
        },
        checkAccount: function (callback) {
            var success = false;
            this.establishConnection({
                sendEnvelope: function (conn, bail) {
                    success = true;
                    bail();
                    callback();
                },
                sendMessage: function (conn) {
                },
                onSendComplete: function (conn) {
                },
                onError: function (err, badAddresses) {
                    if (err === 'bad-user-or-pass') {
                        this.universe.__reportAccountProblem(this.compositeAccount, err, 'outgoing');
                    }
                    callback(err);
                }.bind(this)
            });
        },
        establishConnection: function (callbacks) {
            var scope = this;
            var conn;
            var sendingMessage = false;
            client.createSmtpConnection(this.credentials, this.connInfo, function onCredentialsUpdated() {
                return new Promise(function (resolve) {
                    this.universe.saveAccountDef(this.compositeAccount.accountDef, null, resolve);
                }.bind(this));
            }.bind(this)).then(function (newConn) {
                conn = newConn;
                DisasterRecovery.associateSocketWithAccount(conn.socket, this);
                this._activeConnections.push(conn);
                var oldOnDrain = conn.socket.ondrain;
                conn.socket.ondrain = function () {
                    oldOnDrain && oldOnDrain.call(conn.socket);
                    callbacks.onProgress && callbacks.onProgress();
                };
                callbacks.sendEnvelope(conn, conn.close.bind(conn));
                conn.onready = function (badRecipients) {
                    logic(scope, 'onready');
                    if (badRecipients.length) {
                        conn.close();
                        logic(scope, 'bad-recipients', { badRecipients: badRecipients });
                        callbacks.onError('bad-recipient', badRecipients);
                    } else {
                        sendingMessage = true;
                        callbacks.sendMessage(conn);
                    }
                };
                conn.ondone = function (success) {
                    conn.close();
                    if (success) {
                        logic(scope, 'sent');
                        callbacks.onSendComplete(conn);
                    } else {
                        logic(scope, 'send-failed');
                        var err = client.analyzeSmtpError(conn, null, sendingMessage);
                        callbacks.onError(err, null);
                    }
                };
                conn.onerror = function (err) {
                    conn.close();
                    err = client.analyzeSmtpError(conn, err, sendingMessage);
                    callbacks.onError(err, null);
                };
                conn.onclose = function () {
                    logic(scope, 'onclose');
                    var idx = this._activeConnections.indexOf(conn);
                    if (idx !== -1) {
                        this._activeConnections.splice(idx, 1);
                    } else {
                        logic(scope, 'dead-unknown-connection');
                    }
                }.bind(this);
            }.bind(this)).catch(function (err) {
                err = client.analyzeSmtpError(conn, err, sendingMessage);
                callbacks.onError(err);
            });
        }
    };
    return {
        Account: SmtpAccount,
        SmtpAccount: SmtpAccount
    };
});
;
define('composite/account', [
    'logic',
    '../accountcommon',
    '../a64',
    '../accountmixins',
    '../imap/account',
    '../pop3/account',
    '../smtp/account',
    '../allback',
    'exports'
], function (logic, $accountcommon, $a64, $acctmixins, $imapacct, $pop3acct, $smtpacct, allback, exports) {
    var PIECE_ACCOUNT_TYPE_TO_CLASS = {
        'imap': $imapacct.ImapAccount,
        'pop3': $pop3acct.Pop3Account,
        'smtp': $smtpacct.SmtpAccount
    };
    function CompositeAccount(universe, accountDef, folderInfo, dbConn, receiveProtoConn) {
        this.universe = universe;
        this.id = accountDef.id;
        this.accountDef = accountDef;
        logic.defineScope(this, 'Account', { accountId: this.id });
        this._enabled = true;
        this.problems = [];
        if (accountDef.credentials && accountDef.credentials.oauth2) {
            accountDef.credentials.oauth2._transientLastRenew = 0;
        }
        this.identities = accountDef.identities;
        if (!PIECE_ACCOUNT_TYPE_TO_CLASS.hasOwnProperty(accountDef.receiveType)) {
            logic(this, 'badAccountType', { type: accountDef.receiveType });
        }
        if (!PIECE_ACCOUNT_TYPE_TO_CLASS.hasOwnProperty(accountDef.sendType)) {
            logic(this, 'badAccountType', { type: accountDef.sendType });
        }
        this._receivePiece = new PIECE_ACCOUNT_TYPE_TO_CLASS[accountDef.receiveType](universe, this, accountDef.id, accountDef.credentials, accountDef.receiveConnInfo, folderInfo, dbConn, receiveProtoConn);
        this._sendPiece = new PIECE_ACCOUNT_TYPE_TO_CLASS[accountDef.sendType](universe, this, accountDef.id, accountDef.credentials, accountDef.sendConnInfo, dbConn);
        this.folders = this._receivePiece.folders;
        this.meta = this._receivePiece.meta;
        this.mutations = this._receivePiece.mutations;
        $acctmixins.accountConstructorMixin.call(this, this._receivePiece, this._sendPiece);
    }
    exports.Account = exports.CompositeAccount = CompositeAccount;
    CompositeAccount.prototype = {
        toString: function () {
            return '[CompositeAccount: ' + this.id + ']';
        },
        get supportsServerFolders() {
            return this._receivePiece.supportsServerFolders;
        },
        toBridgeWire: function () {
            return {
                id: this.accountDef.id,
                name: this.accountDef.name,
                type: this.accountDef.type,
                defaultPriority: this.accountDef.defaultPriority,
                enabled: this.enabled,
                problems: this.problems,
                syncRange: this.accountDef.syncRange,
                syncInterval: this.accountDef.syncInterval,
                notifyOnNew: this.accountDef.notifyOnNew,
                playSoundOnSend: this.accountDef.playSoundOnSend,
                identities: this.identities,
                credentials: {
                    username: this.accountDef.credentials.username,
                    outgoingUsername: this.accountDef.credentials.outgoingUsername,
                    oauth2: this.accountDef.credentials.oauth2
                },
                servers: [
                    {
                        type: this.accountDef.receiveType,
                        connInfo: this.accountDef.receiveConnInfo,
                        activeConns: this._receivePiece.numActiveConns || 0
                    },
                    {
                        type: this.accountDef.sendType,
                        connInfo: this.accountDef.sendConnInfo,
                        activeConns: this._sendPiece.numActiveConns || 0
                    }
                ]
            };
        },
        toBridgeFolder: function () {
            return {
                id: this.accountDef.id,
                name: this.accountDef.name,
                path: this.accountDef.name,
                type: 'account'
            };
        },
        get enabled() {
            return this._enabled;
        },
        set enabled(val) {
            this._enabled = this._receivePiece.enabled = val;
        },
        saveAccountState: function (reuseTrans, callback, reason) {
            return this._receivePiece.saveAccountState(reuseTrans, callback, reason);
        },
        get _saveAccountIsImminent() {
            return this.__saveAccountIsImminent;
        },
        set _saveAccountIsImminent(val) {
            this.___saveAccountIsImminent = this._receivePiece._saveAccountIsImminent = val;
        },
        runAfterSaves: function (callback) {
            return this._receivePiece.runAfterSaves(callback);
        },
        allOperationsCompleted: function () {
            if (this._receivePiece.allOperationsCompleted) {
                this._receivePiece.allOperationsCompleted();
            }
        },
        checkAccount: function (callback) {
            var latch = allback.latch();
            this._receivePiece.checkAccount(latch.defer('incoming'));
            this._sendPiece.checkAccount(latch.defer('outgoing'));
            latch.then(function (results) {
                callback(results.incoming[0], results.outgoing[0]);
            });
        },
        shutdown: function (callback) {
            this._sendPiece.shutdown();
            this._receivePiece.shutdown(callback);
        },
        accountDeleted: function () {
            this._sendPiece.accountDeleted();
            this._receivePiece.accountDeleted();
        },
        deleteFolder: function (folderId, callback) {
            return this._receivePiece.deleteFolder(folderId, callback);
        },
        sliceFolderMessages: function (folderId, bridgeProxy) {
            return this._receivePiece.sliceFolderMessages(folderId, bridgeProxy);
        },
        searchFolderMessages: function (folderId, bridgeHandle, phrase, whatToSearch) {
            return this._receivePiece.searchFolderMessages(folderId, bridgeHandle, phrase, whatToSearch);
        },
        syncFolderList: function (callback) {
            return this._receivePiece.syncFolderList(callback);
        },
        sendMessage: function (composer, callback) {
            return this._sendPiece.sendMessage(composer, function (err, errDetails) {
                if (!err) {
                    this._receivePiece.saveSentMessage(composer);
                }
                callback(err, errDetails, null);
            }.bind(this));
        },
        getFolderStorageForFolderId: function (folderId) {
            return this._receivePiece.getFolderStorageForFolderId(folderId);
        },
        getFolderMetaForFolderId: function (folderId) {
            return this._receivePiece.getFolderMetaForFolderId(folderId);
        },
        runOp: function (op, mode, callback) {
            return this._receivePiece.runOp(op, mode, callback);
        },
        ensureEssentialOnlineFolders: function (callback) {
            return this._receivePiece.ensureEssentialOnlineFolders(callback);
        },
        getFirstFolderWithType: $acctmixins.getFirstFolderWithType,
        upgradeFolderStoragesIfNeeded: function () {
            for (var key in this._receivePiece._folderStorages) {
                var storage = this._receivePiece._folderStorages[key];
                storage.upgradeIfNeeded();
            }
        }
    };
});
;
define('composite/configurator', [
    'logic',
    '../accountcommon',
    '../a64',
    '../allback',
    './account',
    '../date',
    'require',
    'exports'
], function (logic, $accountcommon, $a64, $allback, $account, $date, require, exports) {
    var allbackMaker = $allback.allbackMaker;
    exports.account = $account;
    exports.configurator = {
        tryToCreateAccount: function (universe, userDetails, domainInfo, callback) {
            var credentials, incomingInfo, smtpConnInfo, incomingType;
            if (domainInfo) {
                incomingType = domainInfo.type === 'imap+smtp' ? 'imap' : 'pop3';
                var password = null;
                if (userDetails.outgoingPassword !== undefined) {
                    password = userDetails.outgoingPassword;
                } else {
                    password = userDetails.password;
                }
                credentials = {
                    username: domainInfo.incoming.username,
                    password: userDetails.password,
                    outgoingUsername: domainInfo.outgoing.username,
                    outgoingPassword: password
                };
                if (domainInfo.oauth2Tokens) {
                    credentials.oauth2 = {
                        authEndpoint: domainInfo.oauth2Settings.authEndpoint,
                        tokenEndpoint: domainInfo.oauth2Settings.tokenEndpoint,
                        scope: domainInfo.oauth2Settings.scope,
                        clientId: domainInfo.oauth2Secrets.clientId,
                        clientSecret: domainInfo.oauth2Secrets.clientSecret,
                        refreshToken: domainInfo.oauth2Tokens.refreshToken,
                        accessToken: domainInfo.oauth2Tokens.accessToken,
                        expireTimeMS: domainInfo.oauth2Tokens.expireTimeMS,
                        _transientLastRenew: $date.PERFNOW()
                    };
                }
                incomingInfo = {
                    hostname: domainInfo.incoming.hostname,
                    port: domainInfo.incoming.port,
                    crypto: typeof domainInfo.incoming.socketType === 'string' ? domainInfo.incoming.socketType.toLowerCase() : domainInfo.incoming.socketType
                };
                if (incomingType === 'pop3') {
                    incomingInfo.preferredAuthMethod = null;
                }
                smtpConnInfo = {
                    emailAddress: userDetails.emailAddress,
                    hostname: domainInfo.outgoing.hostname,
                    port: domainInfo.outgoing.port,
                    crypto: typeof domainInfo.outgoing.socketType === 'string' ? domainInfo.outgoing.socketType.toLowerCase() : domainInfo.outgoing.socketType
                };
            }
            var incomingPromise = new Promise(function (resolve, reject) {
                if (incomingType === 'imap') {
                    require(['../imap/probe'], function (probe) {
                        probe.probeAccount(credentials, incomingInfo).then(resolve, reject);
                    });
                } else {
                    require(['../pop3/probe'], function (probe) {
                        probe.probeAccount(credentials, incomingInfo).then(resolve, reject);
                    });
                }
            });
            var outgoingPromise = new Promise(function (resolve, reject) {
                require(['../smtp/probe'], function (probe) {
                    probe.probeAccount(credentials, smtpConnInfo).then(resolve, reject);
                });
            });
            Promise.all([
                incomingPromise,
                outgoingPromise
            ]).then(function (results) {
                var incomingConn = results[0].conn;
                var defineAccount;
                if (incomingType === 'imap') {
                    defineAccount = this._defineImapAccount;
                } else if (incomingType === 'pop3') {
                    incomingInfo.preferredAuthMethod = incomingConn.authMethod;
                    defineAccount = this._definePop3Account;
                }
                defineAccount.call(this, universe, userDetails, credentials, incomingInfo, smtpConnInfo, incomingConn, callback);
            }.bind(this)).catch(function (ambiguousErr) {
                incomingPromise.then(function incomingOkButOutgoingFailed(result) {
                    result.conn.close();
                    callback(ambiguousErr, null, { server: smtpConnInfo.hostname });
                }).catch(function incomingFailed(incomingErr) {
                    callback(incomingErr, null, { server: incomingInfo.hostname });
                });
            });
        },
        recreateAccount: function (universe, oldVersion, oldAccountInfo, callback) {
            var oldAccountDef = oldAccountInfo.def;
            var credentials = {
                username: oldAccountDef.credentials.username,
                password: oldAccountDef.credentials.password,
                outgoingUsername: oldAccountDef.credentials.outgoingUsername,
                outgoingPassword: oldAccountDef.credentials.outgoingPassword,
                authMechanism: oldAccountDef.credentials.authMechanism,
                oauth2: oldAccountDef.credentials.oauth2
            };
            var accountId = $a64.encodeInt(universe.config.nextAccountNum++);
            var oldType = oldAccountDef.type || 'imap+smtp';
            var accountDef = {
                id: accountId,
                name: oldAccountDef.name,
                type: oldType,
                receiveType: oldType.split('+')[0],
                sendType: 'smtp',
                syncRange: oldAccountDef.syncRange,
                syncInterval: oldAccountDef.syncInterval || 0,
                notifyOnNew: oldAccountDef.hasOwnProperty('notifyOnNew') ? oldAccountDef.notifyOnNew : true,
                playSoundOnSend: oldAccountDef.hasOwnProperty('playSoundOnSend') ? oldAccountDef.playSoundOnSend : true,
                credentials: credentials,
                receiveConnInfo: {
                    hostname: oldAccountDef.receiveConnInfo.hostname,
                    port: oldAccountDef.receiveConnInfo.port,
                    crypto: oldAccountDef.receiveConnInfo.crypto,
                    preferredAuthMethod: oldAccountDef.receiveConnInfo.preferredAuthMethod || null
                },
                sendConnInfo: {
                    hostname: oldAccountDef.sendConnInfo.hostname,
                    port: oldAccountDef.sendConnInfo.port,
                    crypto: oldAccountDef.sendConnInfo.crypto
                },
                identities: $accountcommon.recreateIdentities(universe, accountId, oldAccountDef.identities)
            };
            this._loadAccount(universe, accountDef, oldAccountInfo.folderInfo, null, function (account) {
                callback(null, account, null);
            });
        },
        _defineImapAccount: function (universe, userDetails, credentials, incomingInfo, smtpConnInfo, imapProtoConn, callback) {
            var accountId = $a64.encodeInt(universe.config.nextAccountNum++);
            var accountDef = {
                id: accountId,
                name: userDetails.accountName || userDetails.emailAddress,
                defaultPriority: $date.NOW(),
                type: 'imap+smtp',
                receiveType: 'imap',
                sendType: 'smtp',
                syncRange: 'auto',
                syncInterval: userDetails.syncInterval || 0,
                notifyOnNew: userDetails.hasOwnProperty('notifyOnNew') ? userDetails.notifyOnNew : true,
                playSoundOnSend: userDetails.hasOwnProperty('playSoundOnSend') ? userDetails.playSoundOnSend : true,
                credentials: credentials,
                receiveConnInfo: incomingInfo,
                sendConnInfo: smtpConnInfo,
                identities: [{
                        id: accountId + '/' + $a64.encodeInt(universe.config.nextIdentityNum++),
                        name: userDetails.displayName,
                        address: userDetails.emailAddress,
                        replyTo: null,
                        signature: null,
                        signatureEnabled: false
                    }]
            };
            this._loadAccount(universe, accountDef, null, imapProtoConn, function (account) {
                callback(null, account, null);
            });
        },
        _definePop3Account: function (universe, userDetails, credentials, incomingInfo, smtpConnInfo, pop3ProtoConn, callback) {
            var accountId = $a64.encodeInt(universe.config.nextAccountNum++);
            var accountDef = {
                id: accountId,
                name: userDetails.accountName || userDetails.emailAddress,
                defaultPriority: $date.NOW(),
                type: 'pop3+smtp',
                receiveType: 'pop3',
                sendType: 'smtp',
                syncRange: 'auto',
                syncInterval: userDetails.syncInterval || 0,
                notifyOnNew: userDetails.hasOwnProperty('notifyOnNew') ? userDetails.notifyOnNew : true,
                playSoundOnSend: userDetails.hasOwnProperty('playSoundOnSend') ? userDetails.playSoundOnSend : true,
                credentials: credentials,
                receiveConnInfo: incomingInfo,
                sendConnInfo: smtpConnInfo,
                identities: [{
                        id: accountId + '/' + $a64.encodeInt(universe.config.nextIdentityNum++),
                        name: userDetails.displayName,
                        address: userDetails.emailAddress,
                        replyTo: null,
                        signature: null,
                        signatureEnabled: false
                    }]
            };
            this._loadAccount(universe, accountDef, null, pop3ProtoConn, function (account) {
                callback(null, account, null);
            });
        },
        _loadAccount: function (universe, accountDef, oldFolderInfo, protoConn, callback) {
            var folderInfo;
            if (accountDef.receiveType === 'imap') {
                folderInfo = {
                    $meta: {
                        nextFolderNum: 0,
                        nextMutationNum: 0,
                        lastFolderSyncAt: 0,
                        capability: oldFolderInfo && oldFolderInfo.$meta.capability || protoConn.capability
                    },
                    $mutations: [],
                    $mutationState: {}
                };
            } else {
                folderInfo = {
                    $meta: {
                        nextFolderNum: 0,
                        nextMutationNum: 0,
                        lastFolderSyncAt: 0
                    },
                    $mutations: [],
                    $mutationState: {}
                };
            }
            universe.saveAccountDef(accountDef, folderInfo);
            universe._loadAccount(accountDef, folderInfo, protoConn, callback);
        }
    };
});
;