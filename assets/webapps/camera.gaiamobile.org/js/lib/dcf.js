define([
    'require',
    'exports',
    'module',
    'asyncStorage',
    'debug',
    'format'
], function (require, exports, module) {
    'use strict';
    var asyncStorage = require('asyncStorage');
    var debug = require('debug')('dcf');
    var format = require('format');
    var dcfConfigLoaded = false;
    var deferredArgs = null;
    var defaultSeq = {
        file: 1,
        dir: 100
    };
    var dcfConfig = {
        key: 'dcf_key',
        seq: null,
        postFix: 'MZLLA',
        prefix: {
            video: 'VID_',
            image: 'IMG_'
        },
        ext: {
            video: '3gp',
            image: 'jpg'
        }
    };
    exports.init = function () {
        debug('initializing');
        exports.checkFileCounter(function () {
            if (deferredArgs) {
                var args = deferredArgs;
                exports.createDCFFilename(args.storage, args.type, args.callback);
                deferredArgs = null;
            }
            debug('initialized');
        });
    };
    exports.checkFileCounter = function (callback) {
        asyncStorage.getItem(dcfConfig.key, function (value) {
            dcfConfigLoaded = true;
            dcfConfig.seq = value ? value : defaultSeq;
            if (callback) {
                callback();
            }
        });
    };
    exports.createDCFFilename = function (storage, type, callback) {
        if (!dcfConfigLoaded) {
            deferredArgs = {
                storage: storage,
                type: type,
                callback: callback
            };
            return;
        }
        var dir = 'DCIM/' + dcfConfig.seq.dir + dcfConfig.postFix + '/';
        var filename = dcfConfig.prefix[type] + format.padLeft(dcfConfig.seq.file, 4, '0') + '.' + dcfConfig.ext[type];
        var filepath = dir + filename;
        var req = storage.get(filepath);
        req.onsuccess = function () {
            dcfConfig.seq.file = 1;
            dcfConfig.seq.dir += 1;
            asyncStorage.setItem(dcfConfig.key, dcfConfig.seq, function () {
                exports.createDCFFilename(storage, type, callback);
            });
        };
        req.onerror = function () {
            if (dcfConfig.seq.file < 9999) {
                dcfConfig.seq.file += 1;
            } else {
                dcfConfig.seq.file = 1;
                dcfConfig.seq.dir += 1;
            }
            asyncStorage.setItem(dcfConfig.key, dcfConfig.seq, function () {
                callback(filepath, filename, dir);
            });
        };
    };
});