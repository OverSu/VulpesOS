define([
    'require',
    'exports',
    'module',
    'debug',
    'lib/bind-all'
], function (require, exports, module) {
    'use strict';
    var debug = require('debug')('controller:media');
    var bindAll = require('lib/bind-all');
    module.exports = function (app) {
        return new MediaController(app);
    };
    module.exports.MediaController = MediaController;
    function MediaController(app) {
        bindAll(this);
        this.app = app;
        this.require = app.require;
        this.settings = app.settings;
        this.bindEvents();
        this.configure();
        debug('initialized');
    }
    MediaController.prototype.bindEvents = function () {
        this.app.on('storage:itemdeleted', this.onItemDeleted);
        this.app.on('previewgallery:deletevideo', this.onItemDeleted);
        this.app.on('previewgallery:deletepicture', this.onItemDeleted);
        this.app.on('storage:changed', this.onStorageChanged);
        this.app.on('newmedia', this.onNewMedia);
        this.app.on('hidden', this.onHidden);
        this.app.on('lazyloaded', this.configured);
        var self = this;
        this.app.once('capture', function () {
            var lib = [
                'lib/create-thumbnail-image',
                'lib/prepare-preview-blob'
            ];
            self.require(lib, function () {
            });
        });
        debug('events bound');
    };
    MediaController.prototype.configure = function () {
        this.items = [];
        this.currentItem = null;
        var dpr = window.devicePixelRatio;
        this.thumbnailSize = {
            width: this.settings.previewGallery.get('thumbnailWidth') * dpr,
            height: this.settings.previewGallery.get('thumbnailHeight') * dpr
        };
        this.configured();
    };
    MediaController.prototype.configured = function () {
        this.app.emit('media:configured', this.items);
    };
    MediaController.prototype.onNewMedia = function (item) {
        if (this.app.activity.pick) {
            return;
        }
        var self = this;
        if (item.isVideo) {
            addNewMedia(item);
        } else {
            this.require(['lib/prepare-preview-blob'], function (preparePreview) {
                preparePreview(item.blob, function (metadata) {
                    metadata.blob = item.blob;
                    metadata.filepath = item.filepath;
                    addNewMedia(metadata);
                });
            });
        }
        function addNewMedia(item) {
            self.items.unshift(item);
            self.updateThumbnail();
        }
    };
    MediaController.prototype.onStorageChanged = function (status) {
        if (status === 'unavailable') {
            this.configure();
            this.updateThumbnail();
        }
    };
    MediaController.prototype.onHidden = function () {
        if (this.app.inSecureMode) {
            this.configure();
            this.updateThumbnail();
        }
    };
    MediaController.prototype.updateThumbnail = function () {
        var media = this.items[0] || null;
        if (media === this.currentItem) {
            return;
        }
        if (media === null) {
            this.app.emit('newthumbnail', null);
            return;
        }
        var blob;
        var metadata = {
            rotation: media.rotation,
            mirrored: media.mirrored
        };
        if (media.isVideo) {
            blob = media.poster.blob;
            metadata.width = media.poster.width;
            metadata.height = media.poster.height;
        } else {
            if (media.preview) {
                var fullRatio = media.width / media.height;
                var previewRatio = media.preview.width / media.preview.height;
                if (Math.abs(fullRatio - previewRatio) < 0.01) {
                    blob = media.blob.slice(media.preview.start, media.preview.end, 'image/jpeg');
                    metadata.width = media.preview.width;
                    metadata.height = media.preview.height;
                }
            }
            if (!blob) {
                blob = media.blob;
                metadata.width = media.width;
                metadata.height = media.height;
            }
        }
        var self = this;
        this.require(['lib/create-thumbnail-image'], function (createThumbnailImage) {
            createThumbnailImage(blob, metadata, self.thumbnailSize, thumb => {
                self.currentItem = media;
                self.app.emit('newthumbnail', thumb);
            });
        });
    };
    MediaController.prototype.onItemDeleted = function (data) {
        var deleteIdx = -1;
        var deletedFilepath = typeof data === 'object' ? data.path : data;
        for (var n = 0; n < this.items.length; n++) {
            if (this.items[n].filepath === deletedFilepath) {
                deleteIdx = n;
                break;
            }
        }
        if (n === this.items.length) {
            return;
        }
        var item = this.items[deleteIdx];
        if (item.resizing) {
            return;
        }
        this.items.splice(deleteIdx, 1);
        this.updateThumbnail();
        this.app.emit('media:deleted');
    };
});