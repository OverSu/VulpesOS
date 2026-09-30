define('activesync/folder', [
    'logic',
    '../date',
    '../syncbase',
    '../allback',
    '../db/mail_rep',
    'activesync/codepages/AirSync',
    'activesync/codepages/AirSyncBase',
    'activesync/codepages/ItemEstimate',
    'activesync/codepages/Email',
    'activesync/codepages/ItemOperations',
    'safe-base64',
    'mimetypes',
    'module',
    'require',
    'exports'
], function (logic, $date, $sync, allback, mailRep, $AirSync, $AirSyncBase, $ItemEstimate, $Email, $ItemOperations, safeBase64, mimetypes, $module, require, exports) {
    'use strict';
    var DESIRED_TEXT_SNIPPET_BYTES = 512;
    var DESIRED_MESSAGE_COUNT = 50;
    var FILTER_TYPE, SYNC_RANGE_TO_FILTER_TYPE, FILTER_TYPE_TO_STRING;
    function initFilterTypes() {
        FILTER_TYPE = $AirSync.Enums.FilterType;
        SYNC_RANGE_TO_FILTER_TYPE = {
            'auto': null,
            '1d': FILTER_TYPE.OneDayBack,
            '3d': FILTER_TYPE.ThreeDaysBack,
            '1w': FILTER_TYPE.OneWeekBack,
            '2w': FILTER_TYPE.TwoWeeksBack,
            '1m': FILTER_TYPE.OneMonthBack,
            'all': FILTER_TYPE.NoFilter
        };
        FILTER_TYPE_TO_STRING = {
            0: 'all messages',
            1: 'one day',
            2: 'three days',
            3: 'one week',
            4: 'two weeks',
            5: 'one month'
        };
    }
    var $wbxml, parseAddresses, $mailchew;
    function lazyConnection(cbIndex, fn, failString) {
        return function lazyRun() {
            var args = Array.slice(arguments), errback = args[cbIndex], self = this;
            require([
                'wbxml',
                'addressparser',
                '../mailchew'
            ], function (wbxml, addressparser, mailchew) {
                if (!$wbxml) {
                    $wbxml = wbxml;
                    parseAddresses = addressparser.parse.bind(addressparser);
                    $mailchew = mailchew;
                    initFilterTypes();
                }
                self._account.withConnection(errback, function () {
                    fn.apply(self, args);
                }, failString);
            });
        };
    }
    function ActiveSyncFolderConn(account, storage) {
        this._account = account;
        this._storage = storage;
        logic.defineScope(this, 'ActiveSyncFolderConn', {
            folderId: storage.folderId,
            accountId: account.id
        });
        this.folderMeta = storage.folderMeta;
        if (!this.syncKey)
            this.syncKey = '0';
    }
    ActiveSyncFolderConn.prototype = {
        get syncKey() {
            return this.folderMeta.syncKey;
        },
        set syncKey(value) {
            return this.folderMeta.syncKey = value;
        },
        get serverId() {
            return this.folderMeta.serverId;
        },
        get filterType() {
            var syncRange = this._account.accountDef.syncRange;
            if (SYNC_RANGE_TO_FILTER_TYPE.hasOwnProperty(syncRange)) {
                var accountFilterType = SYNC_RANGE_TO_FILTER_TYPE[syncRange];
                if (accountFilterType)
                    return accountFilterType;
                else
                    return this.folderMeta.filterType;
            } else {
                console.warn('Got an invalid syncRange (' + syncRange + ') using three days back instead');
                return $AirSync.Enums.FilterType.ThreeDaysBack;
            }
        },
        _getSyncKey: lazyConnection(1, function asfc__getSyncKey(filterType, callback) {
            var folderConn = this;
            var account = this._account;
            var as = $AirSync.Tags;
            var w = new $wbxml.Writer('1.3', 1, 'UTF-8');
            w.stag(as.Sync).stag(as.Collections).stag(as.Collection);
            if (account.conn.currentVersion.lt('12.1'))
                w.tag(as.Class, 'Email');
            w.tag(as.SyncKey, '0').tag(as.CollectionId, this.serverId).stag(as.Options).tag(as.FilterType, filterType).etag().etag().etag().etag();
            account.conn.postCommand(w, function (aError, aResponse) {
                if (aError) {
                    console.error(aError);
                    account._reportErrorIfNecessary(aError);
                    callback('unknown');
                    return;
                }
                folderConn.syncKey = '0';
                var e = new $wbxml.EventParser();
                e.addEventListener([
                    as.Sync,
                    as.Collections,
                    as.Collection,
                    as.SyncKey
                ], function (node) {
                    folderConn.syncKey = node.children[0].textContent;
                });
                e.onerror = function () {
                };
                e.run(aResponse);
                if (folderConn.syncKey === '0') {
                    console.error('Unable to get sync key for folder');
                    callback('unknown');
                } else {
                    callback();
                }
            });
        }),
        _getItemEstimate: lazyConnection(1, function asfc__getItemEstimate(filterType, callback) {
            var ie = $ItemEstimate.Tags;
            var as = $AirSync.Tags;
            var account = this._account;
            var w = new $wbxml.Writer('1.3', 1, 'UTF-8');
            w.stag(ie.GetItemEstimate).stag(ie.Collections).stag(ie.Collection);
            if (this._account.conn.currentVersion.gte('14.0')) {
                w.tag(as.SyncKey, this.syncKey).tag(ie.CollectionId, this.serverId).stag(as.Options).tag(as.FilterType, filterType).etag();
            } else if (this._account.conn.currentVersion.gte('12.0')) {
                w.tag(ie.CollectionId, this.serverId).tag(as.FilterType, filterType).tag(as.SyncKey, this.syncKey);
            } else {
                w.tag(ie.Class, 'Email').tag(as.SyncKey, this.syncKey).tag(ie.CollectionId, this.serverId).tag(as.FilterType, filterType);
            }
            w.etag(ie.Collection).etag(ie.Collections).etag(ie.GetItemEstimate);
            account.conn.postCommand(w, function (aError, aResponse) {
                if (aError) {
                    console.error(aError);
                    account._reportErrorIfNecessary(aError);
                    callback('unknown');
                    return;
                }
                var e = new $wbxml.EventParser();
                var base = [
                    ie.GetItemEstimate,
                    ie.Response
                ];
                var status, estimate;
                e.addEventListener(base.concat(ie.Status), function (node) {
                    status = node.children[0].textContent;
                });
                e.addEventListener(base.concat(ie.Collection, ie.Estimate), function (node) {
                    estimate = parseInt(node.children[0].textContent, 10);
                });
                try {
                    e.run(aResponse);
                } catch (ex) {
                    console.error('Error parsing GetItemEstimate response', ex, '\n', ex.stack);
                    callback('unknown');
                    return;
                }
                if (status !== $ItemEstimate.Enums.Status.Success) {
                    console.error('Error getting item estimate:', status);
                    callback('unknown');
                } else {
                    callback(null, estimate);
                }
            });
        }),
        _inferFilterType: lazyConnection(0, function asfc__inferFilterType(callback) {
            var folderConn = this;
            var Type = $AirSync.Enums.FilterType;
            var getEstimate = function (filterType, onSuccess) {
                folderConn._getSyncKey(filterType, function (error) {
                    if (error) {
                        callback('unknown');
                        return;
                    }
                    folderConn._getItemEstimate(filterType, function (error, estimate) {
                        if (error) {
                            callback(null, Type.ThreeDaysBack);
                            return;
                        }
                        onSuccess(estimate);
                    });
                });
            };
            getEstimate(Type.TwoWeeksBack, function (estimate) {
                var messagesPerDay = estimate / 14;
                var filterType;
                if (estimate < 0)
                    filterType = Type.ThreeDaysBack;
                else if (messagesPerDay >= DESIRED_MESSAGE_COUNT)
                    filterType = Type.OneDayBack;
                else if (messagesPerDay * 3 >= DESIRED_MESSAGE_COUNT)
                    filterType = Type.ThreeDaysBack;
                else if (messagesPerDay * 7 >= DESIRED_MESSAGE_COUNT)
                    filterType = Type.OneWeekBack;
                else if (messagesPerDay * 14 >= DESIRED_MESSAGE_COUNT)
                    filterType = Type.TwoWeeksBack;
                else if (messagesPerDay * 30 >= DESIRED_MESSAGE_COUNT)
                    filterType = Type.OneMonthBack;
                else {
                    getEstimate(Type.NoFilter, function (estimate) {
                        var filterType;
                        if (estimate > DESIRED_MESSAGE_COUNT) {
                            filterType = Type.OneMonthBack;
                            folderConn.syncKey = '0';
                        } else {
                            filterType = Type.NoFilter;
                        }
                        logic(folderConn, 'inferFilterType', { filterType: filterType });
                        callback(null, filterType);
                    });
                    return;
                }
                if (filterType !== Type.TwoWeeksBack) {
                    folderConn.syncKey = '0';
                }
                logic(folderConn, 'inferFilterType', { filterType: filterType });
                callback(null, filterType);
            });
        }),
        _enumerateFolderChanges: lazyConnection(0, function asfc__enumerateFolderChanges(callback, progress) {
            var folderConn = this, storage = this._storage;
            if (!this.filterType) {
                this._inferFilterType(function (error, filterType) {
                    if (error) {
                        callback('unknown');
                        return;
                    }
                    console.log('We want a filter of', FILTER_TYPE_TO_STRING[filterType]);
                    folderConn.folderMeta.filterType = filterType;
                    folderConn._enumerateFolderChanges(callback, progress);
                });
                return;
            }
            if (this.syncKey === '0') {
                this._getSyncKey(this.filterType, function (error) {
                    if (error) {
                        callback('aborted');
                        return;
                    }
                    folderConn._enumerateFolderChanges(callback, progress);
                });
                return;
            }
            var as = $AirSync.Tags;
            var asEnum = $AirSync.Enums;
            var asb = $AirSyncBase.Tags;
            var asbEnum = $AirSyncBase.Enums;
            var w;
            if (this._account._syncsInProgress++ === 0 && this._account._lastSyncKey === this.syncKey && this._account._lastSyncFilterType === this.filterType && this._account._lastSyncResponseWasEmpty) {
                w = as.Sync;
            } else {
                w = new $wbxml.Writer('1.3', 1, 'UTF-8');
                w.stag(as.Sync).stag(as.Collections).stag(as.Collection);
                if (this._account.conn.currentVersion.lt('12.1'))
                    w.tag(as.Class, 'Email');
                w.tag(as.SyncKey, this.syncKey).tag(as.CollectionId, this.serverId).tag(as.GetChanges).stag(as.Options).tag(as.FilterType, this.filterType);
                if (this._account.conn.currentVersion.lte('12.0')) {
                    w.tag(as.MIMESupport, asEnum.MIMESupport.Never).tag(as.Truncation, asEnum.MIMETruncation.TruncateAll);
                }
                w.etag().etag().etag().etag();
            }
            this._account.conn.postCommand(w, function (aError, aResponse) {
                var added = [];
                var changed = [];
                var deleted = [];
                var status;
                var moreAvailable = false;
                folderConn._account._syncsInProgress--;
                if (aError) {
                    console.error('Error syncing folder:', aError);
                    folderConn._account._reportErrorIfNecessary(aError);
                    callback('aborted');
                    return;
                }
                folderConn._account._lastSyncKey = folderConn.syncKey;
                folderConn._account._lastSyncFilterType = folderConn.filterType;
                if (!aResponse) {
                    console.log('Sync completed with empty response');
                    folderConn._account._lastSyncResponseWasEmpty = true;
                    callback(null, added, changed, deleted);
                    return;
                }
                folderConn._account._lastSyncResponseWasEmpty = false;
                var e = new $wbxml.EventParser();
                var base = [
                    as.Sync,
                    as.Collections,
                    as.Collection
                ];
                e.addEventListener(base.concat(as.SyncKey), function (node) {
                    folderConn.syncKey = node.children[0].textContent;
                });
                e.addEventListener(base.concat(as.Status), function (node) {
                    status = node.children[0].textContent;
                });
                e.addEventListener(base.concat(as.MoreAvailable), function (node) {
                    moreAvailable = true;
                });
                e.addEventListener(base.concat(as.Commands, [[
                        as.Add,
                        as.Change
                    ]]), function (node) {
                    var id, guid, msg;
                    for (var iter in Iterator(node.children)) {
                        var child = iter[1];
                        switch (child.tag) {
                        case as.ServerId:
                            guid = child.children[0].textContent;
                            break;
                        case as.ApplicationData:
                            try {
                                msg = folderConn._parseMessage(child, node.tag === as.Add, storage);
                            } catch (ex) {
                                console.error('Failed to parse a message:', ex, '\n', ex.stack);
                                return;
                            }
                            break;
                        }
                    }
                    msg.header.srvid = guid;
                    var collection = node.tag === as.Add ? added : changed;
                    collection.push(msg);
                });
                e.addEventListener(base.concat(as.Commands, [[
                        as.Delete,
                        as.SoftDelete
                    ]]), function (node) {
                    var guid;
                    for (var iter in Iterator(node.children)) {
                        var child = iter[1];
                        switch (child.tag) {
                        case as.ServerId:
                            guid = child.children[0].textContent;
                            break;
                        }
                    }
                    deleted.push(guid);
                });
                try {
                    e.run(aResponse);
                } catch (ex) {
                    console.error('Error parsing Sync response:', ex, '\n', ex.stack);
                    callback('unknown');
                    return;
                }
                if (status === asEnum.Status.Success) {
                    console.log('Sync completed: added ' + added.length + ', changed ' + changed.length + ', deleted ' + deleted.length);
                    callback(null, added, changed, deleted, moreAvailable);
                    if (moreAvailable)
                        folderConn._enumerateFolderChanges(callback, progress);
                } else if (status === asEnum.Status.InvalidSyncKey) {
                    console.warn('ActiveSync had a bad sync key');
                    callback('badkey');
                } else {
                    console.error('Something went wrong during ActiveSync syncing and we ' + 'got a status of ' + status);
                    callback('unknown');
                }
            }, null, null, function progressData(bytesSoFar, totalBytes) {
                if (!totalBytes)
                    totalBytes = Math.max(1000000, bytesSoFar);
                progress(0.1 + 0.7 * bytesSoFar / totalBytes);
            });
        }, 'aborted'),
        _parseMessage: function asfc__parseMessage(node, isAdded, storage) {
            var em = $Email.Tags;
            var asb = $AirSyncBase.Tags;
            var asbEnum = $AirSyncBase.Enums;
            var header, body, flagHeader;
            if (isAdded) {
                var newId = storage._issueNewHeaderId();
                header = {
                    id: newId,
                    srvid: null,
                    suid: storage.folderId + '/' + newId,
                    guid: '',
                    author: null,
                    to: null,
                    cc: null,
                    bcc: null,
                    replyTo: null,
                    date: null,
                    flags: [],
                    hasAttachments: false,
                    subject: null,
                    snippet: null
                };
                body = {
                    date: null,
                    size: 0,
                    attachments: [],
                    relatedParts: [],
                    references: null,
                    bodyReps: null
                };
                flagHeader = function (flag, state) {
                    if (state)
                        header.flags.push(flag);
                };
            } else {
                header = {
                    flags: [],
                    mergeInto: function (o) {
                        for (var iter in Iterator(this.flags)) {
                            var flagstate = iter[1];
                            if (flagstate[1]) {
                                o.flags.push(flagstate[0]);
                            } else {
                                var index = o.flags.indexOf(flagstate[0]);
                                if (index !== -1)
                                    o.flags.splice(index, 1);
                            }
                        }
                        var skip = [
                            'mergeInto',
                            'suid',
                            'srvid',
                            'guid',
                            'id',
                            'flags'
                        ];
                        for (var iter in Iterator(this)) {
                            var key = iter[0], value = iter[1];
                            if (skip.indexOf(key) !== -1)
                                continue;
                            o[key] = value;
                        }
                    }
                };
                body = {
                    mergeInto: function (o) {
                        for (var iter in Iterator(this)) {
                            var key = iter[0], value = iter[1];
                            if (key === 'mergeInto')
                                continue;
                            o[key] = value;
                        }
                    }
                };
                flagHeader = function (flag, state) {
                    header.flags.push([
                        flag,
                        state
                    ]);
                };
            }
            var bodyType, bodySize;
            for (var iter in Iterator(node.children)) {
                var child = iter[1];
                var childText = child.children.length ? child.children[0].textContent : null;
                switch (child.tag) {
                case em.Subject:
                    header.subject = childText;
                    break;
                case em.From:
                    header.author = parseAddresses(childText)[0] || null;
                    break;
                case em.To:
                    header.to = parseAddresses(childText);
                    break;
                case em.Cc:
                    header.cc = parseAddresses(childText);
                    break;
                case em.ReplyTo:
                    header.replyTo = parseAddresses(childText);
                    break;
                case em.DateReceived:
                    body.date = header.date = new Date(childText).valueOf();
                    break;
                case em.Read:
                    flagHeader('\\Seen', childText === '1');
                    break;
                case em.Flag:
                    for (var iter2 in Iterator(child.children)) {
                        var grandchild = iter2[1];
                        if (grandchild.tag === em.Status)
                            flagHeader('\\Flagged', grandchild.children[0].textContent !== '0');
                    }
                    break;
                case asb.Body:
                    for (var iter2 in Iterator(child.children)) {
                        var grandchild = iter2[1];
                        switch (grandchild.tag) {
                        case asb.Type:
                            var type = grandchild.children[0].textContent;
                            if (type === asbEnum.Type.HTML)
                                bodyType = 'html';
                            else {
                                if (type !== asbEnum.Type.PlainText)
                                    console.warn('A message had a strange body type:', type);
                                bodyType = 'plain';
                            }
                            break;
                        case asb.EstimatedDataSize:
                            bodySize = grandchild.children[0].textContent;
                            break;
                        }
                    }
                    break;
                case em.BodySize:
                    bodyType = 'plain';
                    bodySize = childText;
                    break;
                case asb.Attachments:
                case em.Attachments:
                    for (var iter2 in Iterator(child.children)) {
                        var attachmentNode = iter2[1];
                        if (attachmentNode.tag !== asb.Attachment && attachmentNode.tag !== em.Attachment)
                            continue;
                        var attachment = {
                            name: null,
                            contentId: null,
                            type: null,
                            part: null,
                            encoding: null,
                            sizeEstimate: null,
                            file: null
                        };
                        var isInline = false;
                        for (var iter3 in Iterator(attachmentNode.children)) {
                            var attachData = iter3[1];
                            var dot, ext;
                            var attachDataText = attachData.children.length ? attachData.children[0].textContent : null;
                            switch (attachData.tag) {
                            case asb.DisplayName:
                            case em.DisplayName:
                                attachment.name = attachDataText;
                                dot = attachment.name.lastIndexOf('.');
                                ext = dot > 0 ? attachment.name.substring(dot + 1).toLowerCase() : '';
                                attachment.type = mimetypes.detectMimeType(ext);
                                break;
                            case asb.FileReference:
                            case em.AttName:
                            case em.Att0Id:
                                attachment.part = attachDataText;
                                break;
                            case asb.EstimatedDataSize:
                            case em.AttSize:
                                attachment.sizeEstimate = parseInt(attachDataText, 10);
                                break;
                            case asb.ContentId:
                                attachment.contentId = attachDataText;
                                break;
                            case asb.IsInline:
                                isInline = attachDataText === '1';
                                break;
                            }
                        }
                        if (isInline)
                            body.relatedParts.push(mailRep.makeAttachmentPart(attachment));
                        else
                            body.attachments.push(mailRep.makeAttachmentPart(attachment));
                    }
                    header.hasAttachments = body.attachments.length > 0;
                    break;
                }
            }
            if (isAdded) {
                body.bodyReps = [mailRep.makeBodyPart({
                        type: bodyType,
                        sizeEstimate: bodySize,
                        amountDownloaded: 0,
                        isDownloaded: false
                    })];
                return {
                    header: mailRep.makeHeaderInfo(header),
                    body: mailRep.makeBodyInfo(body)
                };
            } else {
                return {
                    header: header,
                    body: body
                };
            }
        },
        downloadBodies: function (headers, options, callback) {
            if (this._account.conn.currentVersion.lt('12.0'))
                return this._syncBodies(headers, callback);
            var downloadsNeeded = 0, folderConn = this;
            var latch = allback.latch();
            for (var i = 0; i < headers.length; i++) {
                var header = headers[i];
                if (!header || header.snippet !== null) {
                    continue;
                }
                downloadsNeeded++;
                this.downloadBodyReps(header, options, latch.defer(header.suid));
            }
            latch.then(function (results) {
                callback(allback.extractErrFromCallbackArgs(results), downloadsNeeded);
            });
        },
        downloadBodyReps: lazyConnection(1, function (header, options, callback) {
            var folderConn = this;
            var account = this._account;
            if (account.conn.currentVersion.lt('12.0'))
                return this._syncBodies([header], callback);
            if (typeof options === 'function') {
                callback = options;
                options = null;
            }
            options = options || {};
            var io = $ItemOperations.Tags;
            var ioEnum = $ItemOperations.Enums;
            var as = $AirSync.Tags;
            var asEnum = $AirSync.Enums;
            var asb = $AirSyncBase.Tags;
            var Type = $AirSyncBase.Enums.Type;
            var gotBody = function gotBody(bodyInfo) {
                if (!bodyInfo)
                    return callback('unknown');
                var bodyRep = bodyInfo.bodyReps[0];
                var bodyType = bodyRep.type === 'html' ? Type.HTML : Type.PlainText;
                var truncationSize;
                if (options.maximumBytesToFetch < bodyRep.sizeEstimate) {
                    bodyType = Type.PlainText;
                    truncationSize = DESIRED_TEXT_SNIPPET_BYTES;
                }
                var w = new $wbxml.Writer('1.3', 1, 'UTF-8');
                w.stag(io.ItemOperations).stag(io.Fetch).tag(io.Store, 'Mailbox').tag(as.CollectionId, folderConn.serverId).tag(as.ServerId, header.srvid).stag(io.Options).stag(io.Schema).tag(asb.Body).etag().stag(asb.BodyPreference).tag(asb.Type, bodyType);
                if (truncationSize)
                    w.tag(asb.TruncationSize, truncationSize);
                w.etag().etag().etag().etag();
                account.conn.postCommand(w, function (aError, aResponse) {
                    if (aError) {
                        console.error(aError);
                        account._reportErrorIfNecessary(aError);
                        callback('unknown');
                        return;
                    }
                    var status, bodyContent, parseError, e = new $wbxml.EventParser();
                    e.addEventListener([
                        io.ItemOperations,
                        io.Status
                    ], function (node) {
                        status = node.children[0].textContent;
                    });
                    e.addEventListener([
                        io.ItemOperations,
                        io.Response,
                        io.Fetch,
                        io.Properties,
                        asb.Body,
                        asb.Data
                    ], function (node) {
                        bodyContent = node.children[0].textContent;
                    });
                    try {
                        e.run(aResponse);
                    } catch (ex) {
                        return callback('unknown');
                    }
                    if (status !== ioEnum.Status.Success)
                        return callback('unknown');
                    folderConn._updateBody(header, bodyInfo, bodyContent, !!truncationSize, callback);
                });
            };
            this._storage.getMessageBody(header.suid, header.date, gotBody);
        }),
        _syncBodies: function (headers, callback) {
            var as = $AirSync.Tags;
            var asEnum = $AirSync.Enums;
            var em = $Email.Tags;
            var folderConn = this;
            var account = this._account;
            var w = new $wbxml.Writer('1.3', 1, 'UTF-8');
            w.stag(as.Sync).stag(as.Collections).stag(as.Collection).tag(as.Class, 'Email').tag(as.SyncKey, this.syncKey).tag(as.CollectionId, this.serverId).stag(as.Options).tag(as.MIMESupport, asEnum.MIMESupport.Never).etag().stag(as.Commands);
            for (var i = 0; i < headers.length; i++) {
                w.stag(as.Fetch).tag(as.ServerId, headers[i].srvid).etag();
            }
            w.etag().etag().etag().etag();
            account.conn.postCommand(w, function (aError, aResponse) {
                if (aError) {
                    console.error(aError);
                    account._reportErrorIfNecessary(aError);
                    callback('unknown');
                    return;
                }
                var latch = allback.latch();
                var iHeader = 0;
                var e = new $wbxml.EventParser();
                var base = [
                    as.Sync,
                    as.Collections,
                    as.Collection
                ];
                e.addEventListener(base.concat(as.SyncKey), function (node) {
                    folderConn.syncKey = node.children[0].textContent;
                });
                e.addEventListener(base.concat(as.Status), function (node) {
                    var status = node.children[0].textContent;
                    if (status !== asEnum.Status.Success) {
                        latch.defer('status')('unknown');
                    }
                });
                e.addEventListener(base.concat(as.Responses, as.Fetch, as.ApplicationData, em.Body), function (node) {
                    var header = headers[iHeader++];
                    var bodyContent = node.children[0].textContent;
                    var latchCallback = latch.defer(header.suid);
                    folderConn._storage.getMessageBody(header.suid, header.date, function (body) {
                        folderConn._updateBody(header, body, bodyContent, false, latchCallback);
                    });
                });
                e.run(aResponse);
                latch.then(function (results) {
                    callback(allback.extractErrFromCallbackArgs(results));
                });
            });
        },
        _activeSyncHeaderIsSeen: function (header) {
            for (var i = 0; i < header.flags.length; i++) {
                if (header.flags[i][0] === '\\Seen' && header.flags[i][1]) {
                    return true;
                }
            }
            return false;
        },
        _updateBody: function (header, bodyInfo, bodyContent, snippetOnly, callback) {
            var bodyRep = bodyInfo.bodyReps[0];
            bodyContent = bodyContent.replace(/\r/g, '');
            var type = snippetOnly ? 'plain' : bodyRep.type;
            var data = $mailchew.processMessageContent(bodyContent, type, !snippetOnly, true);
            header.snippet = data.snippet;
            bodyRep.isDownloaded = !snippetOnly;
            bodyRep.amountDownloaded = bodyContent.length;
            if (!snippetOnly)
                bodyRep.content = data.content;
            var event = { changeDetails: { bodyReps: [0] } };
            var latch = allback.latch();
            this._storage.updateMessageHeader(header.date, header.id, false, header, bodyInfo, latch.defer('header'));
            this._storage.updateMessageBody(header, bodyInfo, {}, event, latch.defer('body'));
            latch.then(callback.bind(null, null, bodyInfo, false));
        },
        sync: lazyConnection(1, function asfc_sync(accuracyStamp, doneCallback, progressCallback) {
            var folderConn = this, addedMessages = 0, changedMessages = 0, deletedMessages = 0;
            logic(this, 'sync_begin');
            var self = this;
            this._enumerateFolderChanges(function (error, added, changed, deleted, moreAvailable) {
                var storage = folderConn._storage;
                if (error === 'badkey') {
                    folderConn._account._recreateFolder(storage.folderId, function (s) {
                        folderConn._storage = null;
                        logic(folderConn, 'sync_end', {
                            full: null,
                            changed: null,
                            deleted: null
                        });
                    });
                    return;
                } else if (error) {
                    logic(folderConn, 'sync_end', {
                        full: null,
                        changed: null,
                        deleted: null
                    });
                    doneCallback(error);
                    return;
                }
                var latch = allback.latch();
                for (var iter in Iterator(added)) {
                    var message = iter[1];
                    if (storage.hasMessageWithServerId(message.header.srvid))
                        continue;
                    storage.addMessageHeader(message.header, message.body, latch.defer());
                    storage.addMessageBody(message.header, message.body, latch.defer());
                    addedMessages++;
                }
                for (var iter in Iterator(changed)) {
                    var message = iter[1];
                    if (!storage.hasMessageWithServerId(message.header.srvid))
                        continue;
                    storage.updateMessageHeaderByServerId(message.header.srvid, true, function (message, oldHeader) {
                        if (!self._activeSyncHeaderIsSeen(oldHeader) && self._activeSyncHeaderIsSeen(message.header)) {
                            storage.folderMeta.unreadCount--;
                        } else if (self._activeSyncHeaderIsSeen(oldHeader) && !self._activeSyncHeaderIsSeen(message.header)) {
                            storage.folderMeta.unreadCount++;
                        }
                        message.header.mergeInto(oldHeader);
                        return true;
                    }.bind(null, message), null, latch.defer());
                    changedMessages++;
                }
                for (var iter in Iterator(deleted)) {
                    var messageGuid = iter[1];
                    if (!storage.hasMessageWithServerId(messageGuid))
                        continue;
                    storage.deleteMessageByServerId(messageGuid, latch.defer());
                    deletedMessages++;
                }
                if (!moreAvailable) {
                    var messagesSeen = addedMessages + changedMessages + deletedMessages;
                    latch.then(function () {
                        logic(folderConn, 'sync_end', {
                            full: addedMessages,
                            changed: changedMessages,
                            deleted: deletedMessages
                        });
                        storage.markSyncRange($sync.OLDEST_SYNC_DATE, accuracyStamp, 'XXX', accuracyStamp);
                        doneCallback(null, null, messagesSeen);
                    });
                }
            }, progressCallback);
        }),
        performMutation: lazyConnection(1, function (invokeWithWriter, callWhenDone) {
            var folderConn = this;
            var as = $AirSync.Tags;
            var account = this._account;
            var w = new $wbxml.Writer('1.3', 1, 'UTF-8');
            w.stag(as.Sync).stag(as.Collections).stag(as.Collection);
            if (account.conn.currentVersion.lt('12.1'))
                w.tag(as.Class, 'Email');
            w.tag(as.SyncKey, this.syncKey).tag(as.CollectionId, this.serverId).tag(as.DeletesAsMoves, this.folderMeta.type === 'trash' ? '0' : '1').tag(as.GetChanges, '0').stag(as.Commands);
            try {
                invokeWithWriter(w);
            } catch (ex) {
                console.error('Exception in performMutation callee:', ex, '\n', ex.stack);
                callWhenDone('unknown');
                return;
            }
            w.etag(as.Commands).etag(as.Collection).etag(as.Collections).etag(as.Sync);
            account.conn.postCommand(w, function (aError, aResponse) {
                if (aError) {
                    console.error('postCommand error:', aError);
                    account._reportErrorIfNecessary(aError);
                    callWhenDone('unknown');
                    return;
                }
                var e = new $wbxml.EventParser();
                var syncKey, status;
                var base = [
                    as.Sync,
                    as.Collections,
                    as.Collection
                ];
                e.addEventListener(base.concat(as.SyncKey), function (node) {
                    syncKey = node.children[0].textContent;
                });
                e.addEventListener(base.concat(as.Status), function (node) {
                    status = node.children[0].textContent;
                });
                try {
                    e.run(aResponse);
                } catch (ex) {
                    console.error('Error parsing Sync response:', ex, '\n', ex.stack);
                    callWhenDone('unknown');
                    return;
                }
                if (status === $AirSync.Enums.Status.Success) {
                    folderConn.syncKey = syncKey;
                    if (callWhenDone)
                        callWhenDone(null);
                } else {
                    console.error('Something went wrong during ActiveSync syncing and we ' + 'got a status of ' + status);
                    callWhenDone('status:' + status);
                }
            });
        }),
        downloadMessageAttachments: lazyConnection(2, function (uid, partInfos, callback, progress) {
            var folderConn = this;
            var io = $ItemOperations.Tags;
            var ioStatus = $ItemOperations.Enums.Status;
            var asb = $AirSyncBase.Tags;
            var w = new $wbxml.Writer('1.3', 1, 'UTF-8');
            w.stag(io.ItemOperations);
            for (var iter in Iterator(partInfos)) {
                var part = iter[1];
                w.stag(io.Fetch).tag(io.Store, 'Mailbox').tag(asb.FileReference, part.part).etag();
            }
            w.etag();
            this._account.conn.postCommand(w, function (aError, aResult) {
                if (aError) {
                    console.error('postCommand error:', aError);
                    folderConn._account._reportErrorIfNecessary(aError);
                    callback('unknown');
                    return;
                }
                var globalStatus;
                var attachments = {};
                var e = new $wbxml.EventParser();
                e.addEventListener([
                    io.ItemOperations,
                    io.Status
                ], function (node) {
                    globalStatus = node.children[0].textContent;
                });
                e.addEventListener([
                    io.ItemOperations,
                    io.Response,
                    io.Fetch
                ], function (node) {
                    var part = null, attachment = {};
                    for (var iter in Iterator(node.children)) {
                        var child = iter[1];
                        switch (child.tag) {
                        case io.Status:
                            attachment.status = child.children[0].textContent;
                            break;
                        case asb.FileReference:
                            part = child.children[0].textContent;
                            break;
                        case io.Properties:
                            var contentType = null, data = null;
                            for (var iter2 in Iterator(child.children)) {
                                var grandchild = iter2[1];
                                var textContent = grandchild.children[0].textContent;
                                switch (grandchild.tag) {
                                case asb.ContentType:
                                    contentType = textContent;
                                    break;
                                case io.Data:
                                    data = safeBase64.decode(textContent);
                                    break;
                                }
                            }
                            if (contentType && data)
                                attachment.data = new Blob([data], { type: contentType });
                            break;
                        }
                        if (part)
                            attachments[part] = attachment;
                    }
                });
                e.run(aResult);
                var error = globalStatus !== ioStatus.Success ? 'unknown' : null;
                var bodies = [];
                for (var iter in Iterator(partInfos)) {
                    var part = iter[1];
                    if (attachments.hasOwnProperty(part.part) && attachments[part.part].status === ioStatus.Success) {
                        bodies.push(attachments[part.part].data);
                    } else {
                        error = 'unknown';
                        bodies.push(null);
                    }
                }
                callback(error, bodies);
            });
        })
    };
    function ActiveSyncFolderSyncer(account, folderStorage) {
        this._account = account;
        this.folderStorage = folderStorage;
        logic.defineScope(this, 'ActiveSyncFolderSyncer', {
            accountId: account.id,
            folderId: folderStorage.folderId
        });
        this.folderConn = new ActiveSyncFolderConn(account, folderStorage);
    }
    exports.ActiveSyncFolderSyncer = ActiveSyncFolderSyncer;
    ActiveSyncFolderSyncer.prototype = {
        get syncable() {
            return this.folderConn.serverId !== null;
        },
        get canGrowSync() {
            return false;
        },
        initialSync: function (slice, initialDays, syncCallback, doneCallback, progressCallback) {
            syncCallback('sync', true);
            this.folderConn.sync($date.NOW(), this.onSyncCompleted.bind(this, doneCallback, true), progressCallback);
        },
        refreshSync: function (slice, dir, startTS, endTS, origStartTS, doneCallback, progressCallback) {
            this.folderConn.sync($date.NOW(), this.onSyncCompleted.bind(this, doneCallback, false), progressCallback);
        },
        growSync: function (slice, growthDirection, anchorTS, syncStepDays, doneCallback, progressCallback) {
            return false;
        },
        onSyncCompleted: function ifs_onSyncCompleted(doneCallback, initialSync, err, bisectInfo, messagesSeen) {
            var storage = this.folderStorage;
            console.log('Sync Completed!', messagesSeen, 'messages synced');
            if (!err)
                storage.markSyncedToDawnOfTime();
            this._account.__checkpointSyncCompleted(function () {
                if (err) {
                    doneCallback(err);
                } else if (initialSync) {
                    storage._curSyncSlice.ignoreHeaders = false;
                    storage._curSyncSlice.waitingOnData = 'db';
                    storage.getMessagesInImapDateRange(0, null, $sync.INITIAL_FILL_SIZE, $sync.INITIAL_FILL_SIZE, storage.onFetchDBHeaders.bind(storage, storage._curSyncSlice, false, doneCallback, null));
                } else {
                    doneCallback(err);
                }
            });
        },
        allConsumersDead: function () {
        },
        shutdown: function () {
            this.folderConn.shutdown();
        }
    };
});
;
define('activesync/jobs', [
    'logic',
    'mix',
    '../jobmixins',
    '../drafts/jobs',
    'activesync/codepages/AirSync',
    'activesync/codepages/Email',
    'activesync/codepages/Move',
    'module',
    'require',
    'exports'
], function (logic, mix, $jobmixins, draftsJobs, $AirSync, $Email, $Move, $module, require, exports) {
    'use strict';
    var $wbxml;
    function lazyConnection(cbIndex, fn, failString) {
        return function lazyRun() {
            var args = Array.slice(arguments), errback = args[cbIndex], self = this;
            require(['wbxml'], function (wbxml) {
                if (!$wbxml) {
                    $wbxml = wbxml;
                }
                self.account.withConnection(errback, function () {
                    fn.apply(self, args);
                }, failString);
            });
        };
    }
    function ActiveSyncJobDriver(account, state) {
        this.account = account;
        this.resilientServerIds = true;
        this._heldMutexReleasers = [];
        logic.defineScope(this, 'ActiveSyncJobDriver', { accountId: this.account.id });
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
    exports.ActiveSyncJobDriver = ActiveSyncJobDriver;
    ActiveSyncJobDriver.prototype = {
        postJobCleanup: $jobmixins.postJobCleanup,
        allJobsDone: $jobmixins.allJobsDone,
        _accessFolderForMutation: function (folderId, needConn, callback, deathback, label) {
            var storage = this.account.getFolderStorageForFolderId(folderId), self = this;
            storage.runMutexed(label, function (releaseMutex) {
                self._heldMutexReleasers.push(releaseMutex);
                var syncer = storage.folderSyncer;
                if (needConn) {
                    self.account.withConnection(callback, function () {
                        try {
                            callback(syncer.folderConn, storage);
                        } catch (ex) {
                            logic(self, 'callbackErr', { ex: ex });
                        }
                    });
                } else {
                    try {
                        callback(syncer.folderConn, storage);
                    } catch (ex) {
                        logic(self, 'callbackErr', { ex: ex });
                    }
                }
            });
        },
        _partitionAndAccessFoldersSequentially: $jobmixins._partitionAndAccessFoldersSequentially,
        local_do_modtags: $jobmixins.local_do_modtags,
        do_modtags: lazyConnection(1, function (op, jobDoneCallback, undo) {
            var addTags = undo ? op.removeTags : op.addTags, removeTags = undo ? op.addTags : op.removeTags;
            function getMark(tag) {
                if (addTags && addTags.indexOf(tag) !== -1)
                    return true;
                if (removeTags && removeTags.indexOf(tag) !== -1)
                    return false;
                return undefined;
            }
            var markRead = getMark('\\Seen');
            var markFlagged = getMark('\\Flagged');
            var as = $AirSync.Tags;
            var em = $Email.Tags;
            var aggrErr = null;
            this._partitionAndAccessFoldersSequentially(op.messages, true, function perFolder(folderConn, storage, serverIds, namers, callWhenDone) {
                var modsToGo = 0;
                function tagsModded(err) {
                    if (err) {
                        console.error('failure modifying tags', err);
                        aggrErr = 'unknown';
                        return;
                    }
                    op.progress += undo ? -serverIds.length : serverIds.length;
                    if (--modsToGo === 0)
                        callWhenDone();
                }
                serverIds = serverIds.filter(function (srvid) {
                    return !!srvid;
                });
                if (!serverIds.length) {
                    callWhenDone();
                    return;
                }
                folderConn.performMutation(function withWriter(w) {
                    for (var i = 0; i < serverIds.length; i++) {
                        w.stag(as.Change).tag(as.ServerId, serverIds[i]).stag(as.ApplicationData);
                        if (markRead !== undefined)
                            w.tag(em.Read, markRead ? '1' : '0');
                        if (markFlagged !== undefined)
                            w.stag(em.Flag).tag(em.Status, markFlagged ? '2' : '0').etag();
                        w.etag(as.ApplicationData).etag(as.Change);
                    }
                }, function mutationPerformed(err) {
                    if (err)
                        aggrErr = err;
                    callWhenDone();
                });
            }, function allDone() {
                jobDoneCallback(aggrErr);
            }, function deadConn() {
                aggrErr = 'aborted-retry';
            }, undo, 'modtags');
        }),
        check_modtags: function (op, callback) {
            callback(null, 'idempotent');
        },
        local_undo_modtags: $jobmixins.local_undo_modtags,
        undo_modtags: function (op, callback) {
            this.do_modtags(op, callback, true);
        },
        local_do_move: $jobmixins.local_do_move,
        do_move: lazyConnection(1, function (op, jobDoneCallback) {
            var aggrErr = null, account = this.account, targetFolderStorage = this.account.getFolderStorageForFolderId(op.targetFolder);
            var mo = $Move.Tags;
            this._partitionAndAccessFoldersSequentially(op.messages, true, function perFolder(folderConn, storage, serverIds, namers, callWhenDone) {
                serverIds = serverIds.filter(function (srvid) {
                    return !!srvid;
                });
                if (!serverIds.length) {
                    callWhenDone();
                    return;
                }
                serverIds = serverIds.filter(function (srvid) {
                    return !!srvid;
                });
                if (!serverIds.length) {
                    callWhenDone();
                    return;
                }
                var w = new $wbxml.Writer('1.3', 1, 'UTF-8');
                w.stag(mo.MoveItems);
                for (var i = 0; i < serverIds.length; i++) {
                    w.stag(mo.Move).tag(mo.SrcMsgId, serverIds[i]).tag(mo.SrcFldId, storage.folderMeta.serverId).tag(mo.DstFldId, targetFolderStorage.folderMeta.serverId).etag(mo.Move);
                }
                w.etag(mo.MoveItems);
                account.conn.postCommand(w, function (err, response) {
                    if (err) {
                        aggrErr = err;
                        console.error('failure moving messages:', err);
                    }
                    callWhenDone();
                });
            }, function allDone() {
                jobDoneCallback(aggrErr, null, true);
            }, function deadConn() {
                aggrErr = 'aborted-retry';
            }, false, 'move');
        }),
        check_move: function (op, jobDoneCallback) {
        },
        local_undo_move: $jobmixins.local_undo_move,
        undo_move: function (op, jobDoneCallback) {
        },
        local_do_delete: $jobmixins.local_do_delete,
        do_delete: lazyConnection(1, function (op, jobDoneCallback) {
            var aggrErr = null;
            var as = $AirSync.Tags;
            var em = $Email.Tags;
            this._partitionAndAccessFoldersSequentially(op.messages, true, function perFolder(folderConn, storage, serverIds, namers, callWhenDone) {
                serverIds = serverIds.filter(function (srvid) {
                    return !!srvid;
                });
                if (!serverIds.length) {
                    callWhenDone();
                    return;
                }
                folderConn.performMutation(function withWriter(w) {
                    for (var i = 0; i < serverIds.length; i++) {
                        w.stag(as.Delete).tag(as.ServerId, serverIds[i]).etag(as.Delete);
                    }
                }, function mutationPerformed(err) {
                    if (err) {
                        aggrErr = err;
                        console.error('failure deleting messages:', err);
                    }
                    callWhenDone();
                });
            }, function allDone() {
                jobDoneCallback(aggrErr, null, true);
            }, function deadConn() {
                aggrErr = 'aborted-retry';
            }, false, 'delete');
        }),
        check_delete: function (op, callback) {
            callback(null, 'idempotent');
        },
        local_undo_delete: $jobmixins.local_undo_delete,
        undo_delete: function (op, callback) {
            callback('moot');
        },
        local_do_syncFolderList: function (op, doneCallback) {
            doneCallback(null);
        },
        do_syncFolderList: lazyConnection(1, function (op, doneCallback) {
            var account = this.account, self = this;
            var inboxFolder = account.getFirstFolderWithType('inbox'), inboxStorage;
            if (inboxFolder && inboxFolder.serverId === null)
                inboxStorage = account.getFolderStorageForFolderId(inboxFolder.id);
            account.syncFolderList(function (err) {
                if (!err)
                    account.meta.lastFolderSyncAt = Date.now();
                doneCallback(err ? 'aborted-retry' : null, null, !err);
                if (inboxStorage && inboxStorage.hasActiveSlices) {
                    if (!err) {
                        console.log('Refreshing fake inbox');
                        inboxStorage.resetAndRefreshActiveSlices();
                    }
                }
            });
        }, 'aborted-retry'),
        check_syncFolderList: function (op, doneCallback) {
            doneCallback(null, 'coherent-notyet');
        },
        local_undo_syncFolderList: function (op, doneCallback) {
            doneCallback('moot');
        },
        undo_syncFolderList: function (op, doneCallback) {
            doneCallback('moot');
        },
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
        local_do_sendOutboxMessages: $jobmixins.local_do_sendOutboxMessages,
        do_sendOutboxMessages: $jobmixins.do_sendOutboxMessages,
        check_sendOutboxMessages: $jobmixins.check_sendOutboxMessages,
        local_undo_sendOutboxMessages: $jobmixins.local_undo_sendOutboxMessages,
        undo_sendOutboxMessages: $jobmixins.undo_sendOutboxMessages,
        local_do_setOutboxSyncEnabled: $jobmixins.local_do_setOutboxSyncEnabled,
        local_do_upgradeDB: $jobmixins.local_do_upgradeDB,
        local_do_purgeExcessMessages: function (op, doneCallback) {
            doneCallback(null);
        },
        do_purgeExcessMessages: function (op, doneCallback) {
            doneCallback(null);
        },
        check_purgeExcessMessages: function (op, doneCallback) {
            return 'idempotent';
        },
        local_undo_purgeExcessMessages: function (op, doneCallback) {
            doneCallback(null);
        },
        undo_purgeExcessMessages: function (op, doneCallback) {
            doneCallback(null);
        }
    };
    mix(ActiveSyncJobDriver.prototype, draftsJobs.draftsMixins);
});
;
define('activesync/account', [
    'logic',
    '../a64',
    '../accountmixins',
    '../mailslice',
    '../searchfilter',
    'activesync/codepages/FolderHierarchy',
    './folder',
    './jobs',
    '../util',
    '../db/folder_info_rep',
    'module',
    'require',
    'exports'
], function (logic, $a64, $acctmixins, $mailslice, $searchfilter, $FolderHierarchy, $asfolder, $asjobs, $util, $folder_info, $module, require, exports) {
    'use strict';
    var $wbxml, $asproto, ASCP;
    var bsearchForInsert = $util.bsearchForInsert;
    var $FolderTypes = $FolderHierarchy.Enums.Type;
    var DEFAULT_TIMEOUT_MS = exports.DEFAULT_TIMEOUT_MS = 30 * 1000;
    exports.makeUniqueDeviceId = function () {
        return Math.random().toString(36).substr(2);
    };
    function lazyConnection(cbIndex, fn, failString) {
        return function lazyRun() {
            var args = Array.slice(arguments), errback = args[cbIndex], self = this;
            this.withConnection(errback, function () {
                fn.apply(self, args);
            }, failString);
        };
    }
    function ActiveSyncAccount(universe, accountDef, folderInfos, dbConn, receiveProtoConn) {
        this.universe = universe;
        this.id = accountDef.id;
        this.accountDef = accountDef;
        if (!accountDef.connInfo.deviceId) {
            accountDef.connInfo.deviceId = exports.makeUniqueDeviceId();
        }
        this._db = dbConn;
        logic.defineScope(this, 'Account', {
            accountId: this.id,
            accountType: 'activesync'
        });
        if (receiveProtoConn) {
            this.conn = receiveProtoConn;
            this._attachLoggerToConnection(this.conn);
        } else {
            this.conn = null;
        }
        this.enabled = true;
        this.problems = [];
        this._alive = true;
        this.identities = accountDef.identities;
        this.folders = [];
        this._folderStorages = {};
        this._folderInfos = folderInfos;
        this._serverIdToFolderId = {};
        this._deadFolderIds = null;
        this._syncsInProgress = 0;
        this._lastSyncKey = null;
        this._lastSyncResponseWasEmpty = false;
        this.meta = folderInfos.$meta;
        this.mutations = folderInfos.$mutations;
        for (var folderId in folderInfos) {
            if (folderId[0] === '$')
                continue;
            var folderInfo = folderInfos[folderId];
            this._folderStorages[folderId] = new $mailslice.FolderStorage(this, folderId, folderInfo, this._db, $asfolder.ActiveSyncFolderSyncer);
            this._serverIdToFolderId[folderInfo.$meta.serverId] = folderId;
            this.folders.push(folderInfo.$meta);
        }
        this.folders.sort(function (a, b) {
            return a.path.localeCompare(b.path);
        });
        this._jobDriver = new $asjobs.ActiveSyncJobDriver(this, this._folderInfos.$mutationState);
        this.ensureEssentialOfflineFolders();
        $acctmixins.accountConstructorMixin.call(this, this, this);
    }
    exports.Account = exports.ActiveSyncAccount = ActiveSyncAccount;
    ActiveSyncAccount.prototype = {
        type: 'activesync',
        supportsServerFolders: true,
        toString: function asa_toString() {
            return '[ActiveSyncAccount: ' + this.id + ']';
        },
        withConnection: function (errback, callback, failString) {
            if (!$wbxml) {
                require([
                    'wbxml',
                    'activesync/protocol',
                    'activesync/codepages'
                ], function (_wbxml, _asproto, _ASCP) {
                    $wbxml = _wbxml;
                    $asproto = _asproto;
                    ASCP = _ASCP;
                    this.withConnection(errback, callback, failString);
                }.bind(this));
                return;
            }
            if (!this.conn) {
                var accountDef = this.accountDef;
                this.conn = new $asproto.Connection(accountDef.connInfo.deviceId);
                this._attachLoggerToConnection(this.conn);
                this.conn.open(accountDef.connInfo.server, accountDef.credentials.username, accountDef.credentials.password);
                this.conn.timeout = DEFAULT_TIMEOUT_MS;
            }
            if (!this.conn.connected) {
                this.conn.connect(function (error) {
                    if (error) {
                        this._reportErrorIfNecessary(error);
                        if (this._isBadUserOrPassError(error) && !failString) {
                            failString = 'bad-user-or-pass';
                        }
                        errback(failString || 'unknown');
                        return;
                    }
                    callback();
                }.bind(this));
            } else {
                callback();
            }
        },
        _isBadUserOrPassError: function (error) {
            return error && error instanceof $asproto.HttpError && error.status === 401;
        },
        _reportErrorIfNecessary: function (error) {
            if (!error) {
                return;
            }
            if (this._isBadUserOrPassError(error)) {
                this.universe.__reportAccountProblem(this, 'bad-user-or-pass', 'incoming');
            }
        },
        _attachLoggerToConnection: function (conn) {
            logic.defineScope(conn, 'ActiveSyncConnection', { connectionId: logic.uniqueId() });
            if (!logic.isCensored) {
                conn.onmessage = this._onmessage_dangerous.bind(this, conn);
            } else {
                conn.onmessage = this._onmessage_safe.bind(this, conn);
            }
        },
        _onmessage_safe: function onmessage(conn, type, special, xhr, params, extraHeaders, sentData, response) {
            if (type === 'options') {
                logic(conn, 'options', {
                    special: special,
                    status: xhr.status,
                    response: response
                });
            } else {
                logic(conn, 'command', {
                    type: type,
                    special: special,
                    status: xhr.status
                });
            }
        },
        _onmessage_dangerous: function onmessage(conn, type, special, xhr, params, extraHeaders, sentData, response) {
            if (type === 'options') {
                logic(conn, 'options', {
                    special: special,
                    status: xhr.status,
                    response: response
                });
            } else {
                var sentXML, receivedXML;
                if (sentData) {
                    try {
                        var sentReader = new $wbxml.Reader(new Uint8Array(sentData), ASCP);
                        sentXML = sentReader.dump();
                    } catch (ex) {
                        sentXML = 'parse problem';
                    }
                }
                if (response) {
                    try {
                        receivedXML = response.dump();
                        response.rewind();
                    } catch (ex) {
                        receivedXML = 'parse problem';
                    }
                }
                logic(conn, 'command', {
                    type: type,
                    special: special,
                    status: xhr.status,
                    params: params,
                    extraHeaders: extraHeaders,
                    sentXML: sentXML,
                    receivedXML: receivedXML
                });
            }
        },
        toBridgeWire: function asa_toBridgeWire() {
            return {
                id: this.accountDef.id,
                name: this.accountDef.name,
                path: this.accountDef.name,
                type: this.accountDef.type,
                defaultPriority: this.accountDef.defaultPriority,
                enabled: this.enabled,
                problems: this.problems,
                syncRange: this.accountDef.syncRange,
                syncInterval: this.accountDef.syncInterval,
                notifyOnNew: this.accountDef.notifyOnNew,
                playSoundOnSend: this.accountDef.playSoundOnSend,
                identities: this.identities,
                credentials: { username: this.accountDef.credentials.username },
                servers: [{
                        type: this.accountDef.type,
                        connInfo: this.accountDef.connInfo
                    }]
            };
        },
        toBridgeFolder: function asa_toBridgeFolder() {
            return {
                id: this.accountDef.id,
                name: this.accountDef.name,
                path: this.accountDef.name,
                type: 'account'
            };
        },
        get numActiveConns() {
            return 0;
        },
        checkAccount: function (callback) {
            if (this.conn != null) {
                if (this.conn.connected) {
                    this.conn.disconnect();
                }
                this.conn = null;
            }
            this.withConnection(function (err) {
                callback(err);
            }, function () {
                callback();
            });
        },
        __checkpointSyncCompleted: function (callback, betterReason) {
            this.saveAccountState(null, callback, betterReason || 'checkpointSync');
        },
        shutdown: function asa_shutdown(callback) {
            if (callback)
                callback();
        },
        accountDeleted: function asa_accountDeleted() {
            this._alive = false;
            this.shutdown();
        },
        sliceFolderMessages: function asa_sliceFolderMessages(folderId, bridgeHandle) {
            var storage = this._folderStorages[folderId], slice = new $mailslice.MailSlice(bridgeHandle, storage);
            storage.sliceOpenMostRecent(slice);
        },
        searchFolderMessages: function (folderId, bridgeHandle, phrase, whatToSearch) {
            var storage = this._folderStorages[folderId], slice = new $searchfilter.SearchSlice(bridgeHandle, storage, phrase, whatToSearch);
            storage.sliceOpenSearch(slice);
            return slice;
        },
        syncFolderList: lazyConnection(0, function asa_syncFolderList(callback) {
            var account = this;
            var fh = ASCP.FolderHierarchy.Tags;
            var w = new $wbxml.Writer('1.3', 1, 'UTF-8');
            w.stag(fh.FolderSync).tag(fh.SyncKey, this.meta.syncKey).etag();
            this.conn.postCommand(w, function (aError, aResponse) {
                if (aError) {
                    account._reportErrorIfNecessary(aError);
                    callback(aError);
                    return;
                }
                var e = new $wbxml.EventParser();
                var deferredAddedFolders = [];
                e.addEventListener([
                    fh.FolderSync,
                    fh.SyncKey
                ], function (node) {
                    account.meta.syncKey = node.children[0].textContent;
                });
                e.addEventListener([
                    fh.FolderSync,
                    fh.Changes,
                    [
                        fh.Add,
                        fh.Delete
                    ]
                ], function (node) {
                    var folder = {};
                    for (var iter in Iterator(node.children)) {
                        var child = iter[1];
                        folder[child.localTagName] = child.children[0].textContent;
                    }
                    if (node.tag === fh.Add) {
                        if (!account._addedFolder(folder.ServerId, folder.ParentId, folder.DisplayName, folder.Type))
                            deferredAddedFolders.push(folder);
                    } else {
                        account._deletedFolder(folder.ServerId);
                    }
                });
                try {
                    e.run(aResponse);
                } catch (ex) {
                    console.error('Error parsing FolderSync response:', ex, '\n', ex.stack);
                    callback('unknown');
                    return;
                }
                while (deferredAddedFolders.length) {
                    var moreDeferredAddedFolders = [];
                    for (var iter in Iterator(deferredAddedFolders)) {
                        var folder = iter[1];
                        if (!account._addedFolder(folder.ServerId, folder.ParentId, folder.DisplayName, folder.Type))
                            moreDeferredAddedFolders.push(folder);
                    }
                    if (moreDeferredAddedFolders.length === deferredAddedFolders.length)
                        throw new Error('got some orphaned folders');
                    deferredAddedFolders = moreDeferredAddedFolders;
                }
                account.ensureEssentialOnlineFolders();
                account.normalizeFolderHierarchy();
                console.log('Synced folder list');
                callback && callback(null);
            });
        }),
        _folderTypes: {
            1: 'normal',
            2: 'inbox',
            3: 'drafts',
            4: 'trash',
            5: 'sent',
            6: 'normal',
            12: 'normal'
        },
        _junkFolderNames: [
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
            'spamowanie',
            'søppelpost',
            'thư rác',
            'спам',
            'דואר זבל',
            'الرسائل العشوائية',
            'هرزنامه',
            'สแปม',
            '垃圾郵件',
            '垃圾邮件',
            '垃圾電郵'
        ],
        _addedFolder: function asa__addedFolder(serverId, parentServerId, displayName, typeNum, forceType, suppressNotification) {
            if (!forceType && !(typeNum in this._folderTypes))
                return true;
            var path = displayName;
            var parentFolderId = null;
            var depth = 0;
            if (parentServerId !== '0') {
                parentFolderId = this._serverIdToFolderId[parentServerId];
                if (parentFolderId === undefined)
                    return null;
                var parent = this._folderInfos[parentFolderId];
                path = parent.$meta.path + '/' + path;
                depth = parent.$meta.depth + 1;
            }
            var useFolderType = this._folderTypes[typeNum];
            if (depth < 2) {
                var normalizedName = displayName.toLowerCase();
                if (this._junkFolderNames.indexOf(normalizedName) !== -1) {
                    useFolderType = 'junk';
                }
            }
            if (forceType) {
                useFolderType = forceType;
            }
            if (typeNum === $FolderTypes.DefaultInbox) {
                var existingInboxMeta = this.getFirstFolderWithType('inbox');
                if (existingInboxMeta) {
                    delete this._serverIdToFolderId[existingInboxMeta.serverId];
                    this._serverIdToFolderId[serverId] = existingInboxMeta.id;
                    existingInboxMeta.serverId = serverId;
                    existingInboxMeta.name = displayName;
                    existingInboxMeta.path = path;
                    existingInboxMeta.depth = depth;
                    return existingInboxMeta;
                }
            }
            var folderId = this.id + '/' + $a64.encodeInt(this.meta.nextFolderNum++);
            var folderInfo = this._folderInfos[folderId] = {
                $meta: $folder_info.makeFolderMeta({
                    id: folderId,
                    serverId: serverId,
                    name: displayName,
                    type: useFolderType,
                    path: path,
                    parentId: parentFolderId,
                    depth: depth,
                    lastSyncedAt: 0,
                    syncKey: '0',
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
                serverIdHeaderBlockMapping: {}
            };
            console.log('Added folder ' + displayName + ' (' + folderId + ')');
            this._folderStorages[folderId] = new $mailslice.FolderStorage(this, folderId, folderInfo, this._db, $asfolder.ActiveSyncFolderSyncer);
            this._serverIdToFolderId[serverId] = folderId;
            var folderMeta = folderInfo.$meta;
            var idx = bsearchForInsert(this.folders, folderMeta, function (a, b) {
                return a.path.localeCompare(b.path);
            });
            this.folders.splice(idx, 0, folderMeta);
            if (!suppressNotification)
                this.universe.__notifyAddedFolder(this, folderMeta);
            return folderMeta;
        },
        _deletedFolder: function asa__deletedFolder(serverId, suppressNotification) {
            var folderId = this._serverIdToFolderId[serverId], folderInfo = this._folderInfos[folderId], folderMeta = folderInfo.$meta;
            console.log('Deleted folder ' + folderMeta.name + ' (' + folderId + ')');
            delete this._serverIdToFolderId[serverId];
            delete this._folderInfos[folderId];
            delete this._folderStorages[folderId];
            var idx = this.folders.indexOf(folderMeta);
            this.folders.splice(idx, 1);
            if (this._deadFolderIds === null)
                this._deadFolderIds = [];
            this._deadFolderIds.push(folderId);
            if (!suppressNotification)
                this.universe.__notifyRemovedFolder(this, folderMeta);
        },
        _recreateFolder: function asa__recreateFolder(folderId, callback) {
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
            folderInfo.serverIdHeaderBlockMapping = {};
            if (this._deadFolderIds === null)
                this._deadFolderIds = [];
            this._deadFolderIds.push(folderId);
            var self = this;
            this.saveAccountState(null, function () {
                var newStorage = new $mailslice.FolderStorage(self, folderId, folderInfo, self._db, $asfolder.ActiveSyncFolderSyncer);
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
        createFolder: lazyConnection(3, function asa_createFolder(parentFolderId, folderName, containOnlyOtherFolders, callback) {
            var account = this;
            var parentFolderServerId = parentFolderId ? this._folderInfos[parentFolderId] : '0';
            var fh = ASCP.FolderHierarchy.Tags;
            var fhStatus = ASCP.FolderHierarchy.Enums.Status;
            var folderType = ASCP.FolderHierarchy.Enums.Type.Mail;
            var w = new $wbxml.Writer('1.3', 1, 'UTF-8');
            w.stag(fh.FolderCreate).tag(fh.SyncKey, this.meta.syncKey).tag(fh.ParentId, parentFolderServerId).tag(fh.DisplayName, folderName).tag(fh.Type, folderType).etag();
            this.conn.postCommand(w, function (aError, aResponse) {
                account._reportErrorIfNecessary(aError);
                var e = new $wbxml.EventParser();
                var status, serverId;
                e.addEventListener([
                    fh.FolderCreate,
                    fh.Status
                ], function (node) {
                    status = node.children[0].textContent;
                });
                e.addEventListener([
                    fh.FolderCreate,
                    fh.SyncKey
                ], function (node) {
                    account.meta.syncKey = node.children[0].textContent;
                });
                e.addEventListener([
                    fh.FolderCreate,
                    fh.ServerId
                ], function (node) {
                    serverId = node.children[0].textContent;
                });
                try {
                    e.run(aResponse);
                } catch (ex) {
                    console.error('Error parsing FolderCreate response:', ex, '\n', ex.stack);
                    callback('unknown');
                    return;
                }
                if (status === fhStatus.Success) {
                    var folderMeta = account._addedFolder(serverId, parentFolderServerId, folderName, folderType);
                    callback(null, folderMeta);
                } else if (status === fhStatus.FolderExists) {
                    callback('already-exists');
                } else {
                    callback('unknown');
                }
            });
        }),
        deleteFolder: lazyConnection(1, function asa_deleteFolder(folderId, callback) {
            var account = this;
            var folderMeta = this._folderInfos[folderId].$meta;
            var fh = ASCP.FolderHierarchy.Tags;
            var fhStatus = ASCP.FolderHierarchy.Enums.Status;
            var folderType = ASCP.FolderHierarchy.Enums.Type.Mail;
            var w = new $wbxml.Writer('1.3', 1, 'UTF-8');
            w.stag(fh.FolderDelete).tag(fh.SyncKey, this.meta.syncKey).tag(fh.ServerId, folderMeta.serverId).etag();
            this.conn.postCommand(w, function (aError, aResponse) {
                account._reportErrorIfNecessary(aError);
                var e = new $wbxml.EventParser();
                var status;
                e.addEventListener([
                    fh.FolderDelete,
                    fh.Status
                ], function (node) {
                    status = node.children[0].textContent;
                });
                e.addEventListener([
                    fh.FolderDelete,
                    fh.SyncKey
                ], function (node) {
                    account.meta.syncKey = node.children[0].textContent;
                });
                try {
                    e.run(aResponse);
                } catch (ex) {
                    console.error('Error parsing FolderDelete response:', ex, '\n', ex.stack);
                    callback('unknown');
                    return;
                }
                if (status === fhStatus.Success) {
                    account._deletedFolder(folderMeta.serverId);
                    callback(null, folderMeta);
                } else {
                    callback('unknown');
                }
            });
        }),
        sendMessage: lazyConnection(1, function asa_sendMessage(composer, callback) {
            var account = this;
            composer.withMessageBlob({ includeBcc: true }, function (mimeBlob) {
                if (this.conn.currentVersion.gte('14.0')) {
                    var cm = ASCP.ComposeMail.Tags;
                    var w = new $wbxml.Writer('1.3', 1, 'UTF-8', null, 'blob');
                    w.stag(cm.SendMail).tag(cm.ClientId, Date.now().toString() + '@mozgaia').tag(cm.SaveInSentItems).stag(cm.Mime).opaque(mimeBlob).etag().etag();
                    this.conn.postCommand(w, function (aError, aResponse) {
                        if (aError) {
                            account._reportErrorIfNecessary(aError);
                            console.error(aError);
                            callback('unknown');
                            return;
                        }
                        if (aResponse === null) {
                            console.log('Sent message successfully!');
                            callback(null);
                        } else {
                            console.error('Error sending message. XML dump follows:\n' + aResponse.dump());
                            callback('unknown');
                        }
                    }, null, null, function () {
                        composer.renewSmartWakeLock('ActiveSync XHR Progress');
                    });
                } else {
                    this.conn.postData('SendMail', 'message/rfc822', mimeBlob, function (aError, aResponse) {
                        if (aError) {
                            account._reportErrorIfNecessary(aError);
                            console.error(aError);
                            callback('unknown');
                            return;
                        }
                        console.log('Sent message successfully!');
                        callback(null);
                    }, { SaveInSent: 'T' }, null, function () {
                        composer.renewSmartWakeLock('ActiveSync XHR Progress');
                    });
                }
            }.bind(this));
        }),
        getFolderStorageForFolderId: function asa_getFolderStorageForFolderId(folderId) {
            return this._folderStorages[folderId];
        },
        getFolderStorageForServerId: function asa_getFolderStorageForServerId(serverId) {
            return this._folderStorages[this._serverIdToFolderId[serverId]];
        },
        getFolderMetaForFolderId: function (folderId) {
            if (this._folderInfos.hasOwnProperty(folderId))
                return this._folderInfos[folderId].$meta;
            return null;
        },
        ensureEssentialOfflineFolders: function () {
            [
                {
                    type: 'inbox',
                    displayName: 'Inbox',
                    typeNum: $FolderTypes.DefaultInbox
                },
                {
                    type: 'outbox',
                    displayName: 'outbox',
                    typeNum: $FolderTypes.Unknown
                },
                {
                    type: 'localdrafts',
                    displayName: 'localdrafts',
                    typeNum: $FolderTypes.Unknown
                }
            ].forEach(function (data) {
                if (!this.getFirstFolderWithType(data.type)) {
                    this._addedFolder(null, '0', data.displayName, data.typeNum, data.type, true);
                }
            }, this);
        },
        ensureEssentialOnlineFolders: function (callback) {
            callback && callback();
        },
        normalizeFolderHierarchy: $acctmixins.normalizeFolderHierarchy,
        scheduleMessagePurge: function (folderId, callback) {
            if (callback)
                callback();
        },
        upgradeFolderStoragesIfNeeded: $acctmixins.upgradeFolderStoragesIfNeeded,
        runOp: $acctmixins.runOp,
        getFirstFolderWithType: $acctmixins.getFirstFolderWithType,
        getFolderByPath: $acctmixins.getFolderByPath,
        saveAccountState: $acctmixins.saveAccountState,
        runAfterSaves: $acctmixins.runAfterSaves,
        allOperationsCompleted: function () {
        }
    };
});
;
define('activesync/configurator', [
    'logic',
    '../accountcommon',
    '../a64',
    './account',
    '../date',
    'tcp-socket',
    'require',
    'exports'
], function (logic, $accountcommon, $a64, $asacct, $date, tcpSocket, require, exports) {
    function checkServerCertificate(url, callback) {
        var match = /^https:\/\/([^:/]+)(?::(\d+))?/.exec(url);
        if (!match) {
            callback(null);
            return;
        }
        var port = match[2] ? parseInt(match[2], 10) : 443, host = match[1];
        console.log('checking', host, port, 'for security problem');
        var sock = tcpSocket.open(host, port);
        function reportAndClose(err) {
            if (sock) {
                var wasSock = sock;
                sock = null;
                try {
                    wasSock.close();
                } catch (ex) {
                }
                callback(err);
            }
        }
        sock.onopen = function () {
            sock.send(new TextEncoder('utf-8').encode('GET /images/logo.png HTTP/1.1\n\n'));
        };
        sock.onerror = function (err) {
            var reportErr = null;
            if (err && typeof err === 'object' && /^Security/.test(err.name))
                reportErr = 'bad-security';
            reportAndClose(reportErr);
        };
        sock.ondata = function (data) {
            reportAndClose(null);
        };
    }
    var scope = logic.scope('ActivesyncConfigurator');
    exports.account = $asacct;
    exports.configurator = {
        timeout: 30 * 1000,
        _getFullDetailsFromAutodiscover: function ($asproto, userDetails, url, callback) {
            logic(scope, 'autodiscover:begin', { url: url });
            $asproto.raw_autodiscover(url, userDetails.emailAddress, userDetails.password, self.timeout, false, function (error, config) {
                if (error) {
                    var failureType = 'no-config-info', failureDetails = {};
                    if (error instanceof $asproto.HttpError) {
                        if (error.status === 401)
                            failureType = 'bad-user-or-pass';
                        else if (error.status === 403)
                            failureType = 'not-authorized';
                        else
                            failureDetails.status = error.status;
                    } else if (error instanceof $asproto.AutodiscoverDomainError) {
                        logic(scope, 'autodiscover.error', { message: error.message });
                    }
                    logic(scope, 'autodiscover:end', {
                        url: url,
                        err: failureType
                    });
                    callback(failureType, null, failureDetails);
                    return;
                }
                logic(scope, 'autodiscover:end', {
                    url: url,
                    server: config.mobileSyncServer.url
                });
                var autoconfig = {
                    type: 'activesync',
                    displayName: config.user.name,
                    incoming: {
                        server: config.mobileSyncServer.url,
                        username: config.user.email
                    }
                };
                callback(null, autoconfig, null);
            });
        },
        tryToCreateAccount: function (universe, userDetails, domainInfo, callback) {
            require(['activesync/protocol'], function ($asproto) {
                if (domainInfo.incoming.autodiscoverEndpoint) {
                    this._getFullDetailsFromAutodiscover($asproto, userDetails, domainInfo.incoming.autodiscoverEndpoint, function (err, fullConfigInfo, errDetails) {
                        if (err) {
                            callback(err, fullConfigInfo, errDetails);
                            return;
                        }
                        this._createAccountUsingFullInfo(universe, userDetails, fullConfigInfo, callback, $asproto);
                    }.bind(this));
                    return;
                }
                this._createAccountUsingFullInfo(universe, userDetails, domainInfo, callback, $asproto);
            }.bind(this));
        },
        _createAccountUsingFullInfo: function (universe, userDetails, domainInfo, callback, $asproto) {
            logic(scope, 'create:begin', { server: domainInfo.incoming.server });
            var credentials = {
                username: domainInfo.incoming.username,
                password: userDetails.password
            };
            var deviceId = $asacct.makeUniqueDeviceId();
            var self = this;
            var conn = new $asproto.Connection(deviceId);
            conn.open(domainInfo.incoming.server, credentials.username, credentials.password);
            conn.timeout = $asacct.DEFAULT_TIMEOUT_MS;
            conn.connect(function (error, options) {
                if (error) {
                    var failureType, failureDetails = { server: domainInfo.incoming.server };
                    if (error instanceof $asproto.HttpError) {
                        if (error.status === 401) {
                            failureType = 'bad-user-or-pass';
                        } else if (error.status === 403) {
                            failureType = 'not-authorized';
                        } else {
                            failureType = 'server-problem';
                            failureDetails.status = error.status;
                        }
                    } else {
                        checkServerCertificate(domainInfo.incoming.server, function (securityError) {
                            var failureType;
                            if (securityError)
                                failureType = 'bad-security';
                            else
                                failureType = 'unresponsive-server';
                            callback(failureType, null, failureDetails);
                        });
                        return;
                    }
                    logic(scope, 'create:end', {
                        server: domainInfo.incoming.server,
                        err: failureType
                    });
                    callback(failureType, null, failureDetails);
                    return;
                }
                var accountId = $a64.encodeInt(universe.config.nextAccountNum++);
                var accountDef = {
                    id: accountId,
                    name: userDetails.accountName || userDetails.emailAddress,
                    defaultPriority: $date.NOW(),
                    type: 'activesync',
                    syncRange: 'auto',
                    syncInterval: userDetails.syncInterval || 0,
                    notifyOnNew: userDetails.hasOwnProperty('notifyOnNew') ? userDetails.notifyOnNew : true,
                    playSoundOnSend: userDetails.hasOwnProperty('playSoundOnSend') ? userDetails.playSoundOnSend : true,
                    credentials: credentials,
                    connInfo: {
                        server: domainInfo.incoming.server,
                        deviceId: deviceId
                    },
                    identities: [{
                            id: accountId + '/' + $a64.encodeInt(universe.config.nextIdentityNum++),
                            name: userDetails.displayName || domainInfo.displayName,
                            address: userDetails.emailAddress,
                            replyTo: null,
                            signature: null
                        }]
                };
                logic(scope, 'create:end', {
                    server: domainInfo.incoming.server,
                    id: accountId
                });
                self._loadAccount(universe, accountDef, conn, function (account) {
                    callback(null, account, null);
                });
            });
        },
        recreateAccount: function cfg_as_ra(universe, oldVersion, oldAccountInfo, callback) {
            var oldAccountDef = oldAccountInfo.def;
            var credentials = {
                username: oldAccountDef.credentials.username,
                password: oldAccountDef.credentials.password
            };
            var accountId = $a64.encodeInt(universe.config.nextAccountNum++);
            var accountDef = {
                id: accountId,
                name: oldAccountDef.name,
                type: 'activesync',
                syncRange: oldAccountDef.syncRange,
                syncInterval: oldAccountDef.syncInterval || 0,
                notifyOnNew: oldAccountDef.hasOwnProperty('notifyOnNew') ? oldAccountDef.notifyOnNew : true,
                playSoundOnSend: oldAccountDef.hasOwnProperty('playSoundOnSend') ? oldAccountDef.playSoundOnSend : true,
                credentials: credentials,
                connInfo: {
                    server: oldAccountDef.connInfo.server,
                    deviceId: oldAccountDef.connInfo.deviceId || $asacct.makeUniqueDeviceId()
                },
                identities: $accountcommon.recreateIdentities(universe, accountId, oldAccountDef.identities)
            };
            this._loadAccount(universe, accountDef, null, function (account) {
                callback(null, account, null);
            });
        },
        _loadAccount: function cfg_as__loadAccount(universe, accountDef, protoConn, callback) {
            var folderInfo = {
                $meta: {
                    nextFolderNum: 0,
                    nextMutationNum: 0,
                    lastFolderSyncAt: 0,
                    syncKey: '0'
                },
                $mutations: [],
                $mutationState: {}
            };
            universe.saveAccountDef(accountDef, folderInfo);
            universe._loadAccount(accountDef, folderInfo, protoConn, callback);
        }
    };
});
;