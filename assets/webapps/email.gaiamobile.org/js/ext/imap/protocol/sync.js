define([
    '../imapchew',
    '../../allback',
    'exports'
], function ($imapchew, allback, exports) {
    var INITIAL_FETCH_PARAMS = [
        'BODYSTRUCTURE',
        'INTERNALDATE',
        'FLAGS',
        'BODY.PEEK[HEADER.FIELDS (FROM TO CC BCC SUBJECT REPLY-TO MESSAGE-ID REFERENCES)]'
    ];
    var FLAG_FETCH_PARAMS = ['FLAGS'];
    var SNIPPET_BYTES = 256;
    var KNOWN_HEADERS_AGGR_COST = 20, KNOWN_HEADERS_PER_COST = 1, NEW_HEADERS_AGGR_COST = 20, NEW_HEADERS_PER_COST = 5, NEW_BODIES_PER_COST = 30;
    function Sync(options) {
        this.storage = options.storage;
        this.connection = options.connection;
        this.knownHeaders = options.knownHeaders || [];
        this.knownUIDs = options.knownUIDs || [];
        this.newUIDs = options.newUIDs || [];
        this._progress = options.initialProgress || 0.25;
        this._progressCost = (this.knownUIDs.length ? KNOWN_HEADERS_AGGR_COST : 0) + KNOWN_HEADERS_PER_COST * this.knownUIDs.length + (this.newUIDs.length ? NEW_HEADERS_AGGR_COST : 0) + NEW_HEADERS_PER_COST * this.newUIDs.length;
        this.onprogress = null;
        this.oncomplete = null;
        this._beginSync();
    }
    Sync.prototype = {
        _updateProgress: function (newProgress) {
            this._progress += newProgress;
            if (this.onprogress) {
                this.onprogress(0.25 + 0.75 * (this._progress / this._progressCost));
            }
        },
        _beginSync: function () {
            var latch = allback.latch();
            if (this.newUIDs.length) {
                this._handleNewUids(latch.defer('new'));
            }
            if (this.knownUIDs.length) {
                this._handleKnownUids(latch.defer('known'));
            }
            latch.then(function () {
                if (!this.oncomplete) {
                    return;
                }
                this.oncomplete(this.newUIDs.length, this.knownUIDs.length);
            }.bind(this));
        },
        _handleNewUids: function (callback) {
            var pendingSnippets = [];
            var self = this;
            this.connection.listMessages(this.newUIDs, INITIAL_FETCH_PARAMS, { byUid: true }, function (err, messages) {
                if (err) {
                    console.warn('New UIDs fetch error, ideally harmless:', err);
                    callback();
                    return;
                }
                var latch = allback.latch();
                messages.forEach(function (msg) {
                    var recentIdx = msg.flags.indexOf('\\Recent');
                    if (recentIdx !== -1) {
                        msg.flags.splice(recentIdx, 1);
                    }
                    try {
                        var chewRep = $imapchew.chewHeaderAndBodyStructure(msg, self.storage.folderId, self.storage._issueNewHeaderId());
                        chewRep.header.bytesToDownloadForBodyDisplay = $imapchew.calculateBytesToDownloadForImapBodyDisplay(chewRep.bodyInfo);
                        pendingSnippets.push(chewRep);
                        self.storage.addMessageHeader(chewRep.header, chewRep.bodyInfo, latch.defer());
                        self.storage.addMessageBody(chewRep.header, chewRep.bodyInfo, latch.defer());
                    } catch (ex) {
                        console.warn('message problem, skipping message', ex, '\n', ex.stack);
                    }
                }.bind(this));
                latch.then(callback);
            }.bind(this));
        },
        _handleKnownUids: function (callback) {
            var self = this;
            this.connection.listMessages(self.knownUIDs, FLAG_FETCH_PARAMS, { byUid: true }, function (err, messages) {
                if (err) {
                    console.warn('Known UIDs fetch error, ideally harmless:', err);
                    callback();
                    return;
                }
                var latch = allback.latch();
                messages.forEach(function (msg, i) {
                    console.log('FETCHED', i, 'known id', self.knownHeaders[i].id, 'known srvid', self.knownHeaders[i].srvid, 'actual id', msg.uid);
                    var recentIdx = msg.flags.indexOf('\\Recent');
                    if (recentIdx !== -1) {
                        msg.flags.splice(recentIdx, 1);
                    }
                    if (self.knownHeaders[i].srvid !== msg.uid) {
                        i = self.knownUIDs.indexOf(msg.uid);
                        if (i === -1) {
                            console.warn('Server fetch reports unexpected message:', msg.uid);
                            return;
                        }
                    }
                    var header = self.knownHeaders[i];
                    var sortedExistingFlags = header.flags.slice();
                    sortedExistingFlags.sort();
                    msg.flags.sort();
                    if (header.flags.indexOf('\\Seen') === -1 && msg.flags.indexOf('\\Seen') !== -1) {
                        self.storage.folderMeta.unreadCount--;
                    } else if (header.flags.indexOf('\\Seen') !== -1 && msg.flags.indexOf('\\Seen') === -1) {
                        self.storage.folderMeta.unreadCount++;
                    }
                    if (header.flags.toString() !== msg.flags.toString()) {
                        console.warn('  FLAGS: "' + header.flags.toString() + '" VS "' + msg.flags.toString() + '"');
                        header.flags = msg.flags;
                        self.storage.updateMessageHeader(header.date, header.id, true, header, null, latch.defer());
                    } else {
                        self.storage.unchangedMessageHeader(header);
                    }
                });
                self._updateProgress(KNOWN_HEADERS_AGGR_COST + KNOWN_HEADERS_PER_COST * self.knownUIDs.length);
                latch.then(callback);
            }.bind(this));
        }
    };
    exports.Sync = Sync;
});