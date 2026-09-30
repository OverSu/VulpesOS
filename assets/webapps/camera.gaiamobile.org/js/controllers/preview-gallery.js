define([
    'require',
    'exports',
    'module',
    'debug',
    'lib/string-utils',
    'lib/bind-all',
    'views/preview-gallery',
    'CustomDialog'
], function (require, exports, module) {
    'use strict';
    var debug = require('debug')('controller:preview-gallery');
    var StringUtils = require('lib/string-utils');
    var bindAll = require('lib/bind-all');
    var PreviewGalleryView = require('views/preview-gallery');
    var CustomDialog = require('CustomDialog');
    module.exports = function (app) {
        return new PreviewGalleryController(app);
    };
    module.exports.PreviewGalleryController = PreviewGalleryController;
    function PreviewGalleryController(app) {
        bindAll(this);
        this.app = app;
        this.require = app.require;
        this.settings = app.settings;
        this.dialog = app.dialog || CustomDialog;
        this.resizeImageAndSave = app.resizeImageAndSave;
        this.currentItemIndex = 0;
        this.bindEvents();
        debug('initialized');
    }
    PreviewGalleryController.prototype.bindEvents = function () {
        this.app.on('media:configured', this.updatePreviewGallery);
        this.app.on('media:deleted', this.updatePreviewGallery);
        this.app.on('preview', this.openPreview);
        this.app.on('hidden', this.closePreview);
        debug('events bound');
    };
    PreviewGalleryController.prototype.resetPreviewGallery = function (items) {
        this.items = items;
    };
    PreviewGalleryController.prototype.openPreview = function () {
        if (this.app.activity.pick || this.view || this.app.hidden) {
            return;
        }
        var maxPreviewSize = window.CONFIG_MAX_IMAGE_PIXEL_SIZE;
        this.view = new PreviewGalleryView();
        this.view.maxPreviewSize = maxPreviewSize;
        this.view.render().appendTo(this.app.el);
        this.view.on('click:gallery', this.onGalleryButtonClick);
        this.view.on('click:share', this.shareCurrentItem);
        this.view.on('click:delete', this.deleteCurrentItem);
        this.view.on('click:back', this.closePreview);
        this.view.on('swipe', this.handleSwipe);
        this.view.on('click:options', this.onOptionsClick);
        this.view.on('loadingvideo', this.app.firer('busy'));
        this.view.on('playingvideo', this.app.firer('ready'));
        var secureMode = this.app.inSecureMode;
        this.view.set('secure-mode', secureMode);
        this.view.open();
        this.previewItem();
        this.app.emit('previewgallery:opened');
    };
    PreviewGalleryController.prototype.closePreview = function () {
        if (this.view) {
            this.currentItemIndex = 0;
            this.view.close();
            this.view.destroy();
            this.view = null;
        }
        this.app.emit('previewgallery:closed');
    };
    PreviewGalleryController.prototype.onGalleryButtonClick = function () {
        if (this.app.inSecureMode) {
            return;
        }
        var MozActivity = window.MozActivity;
        this.mozActivity = new MozActivity({
            name: 'browse',
            data: { type: 'photos' }
        });
    };
    PreviewGalleryController.prototype.onOptionsClick = function () {
        if (this.app.inSecureMode) {
            return;
        }
        this.view.showOptionsMenu();
    };
    PreviewGalleryController.prototype.shareCurrentItem = function () {
        var index = this.currentItemIndex;
        var item = this.items[index];
        if (this.app.inSecureMode || !item || item.resizing) {
            return;
        }
        var type = item.isVideo ? 'video/*' : 'image/*';
        var filename = StringUtils.lastPathComponent(item.filepath);
        var launchShareActivity = function (blob) {
            var activity = new window.MozActivity({
                name: 'share',
                data: {
                    type: type,
                    number: 1,
                    blobs: [blob],
                    filenames: [filename],
                    filepaths: [item.filepath]
                }
            });
            activity.onerror = function (e) {
                console.warn('Share activity error:', activity.error.name);
            };
        };
        if (item.isVideo) {
            launchShareActivity(item.blob);
            return;
        }
        var self = this;
        item.resizing = true;
        this.app.emit('busy', 'resizingImage');
        var maxSize = this.settings.activity.get('maxSharePixelSize');
        this.require(['lib/resize-image-and-save'], function (resize) {
            if (!self.resizeImageAndSave) {
                self.resizeImageAndSave = resize;
            }
            self.resizeImageAndSave({
                blob: item.blob,
                size: maxSize
            }, function (resizedBlob) {
                if (resizedBlob !== item.blob) {
                    item.blob = resizedBlob;
                    if (maxSize && maxSize.width && maxSize.height) {
                        item.width = maxSize.width;
                        item.height = maxSize.height;
                    } else if (item.rotation === 90 || item.rotation === 270) {
                        var tmp = item.width;
                        item.width = item.height;
                        item.height = tmp;
                    }
                    delete item.rotation;
                }
                delete item.resizing;
                self.app.emit('ready');
                launchShareActivity(resizedBlob);
            });
        });
    };
    PreviewGalleryController.prototype.deleteCurrentItem = function () {
        if (this.app.inSecureMode) {
            return;
        }
        var index = this.currentItemIndex;
        var item = this.items[index];
        var filepath = item.filepath;
        var dialog = this.dialog;
        var self = this;
        var msg;
        if (item.isVideo) {
            msg = 'delete-video?';
        } else {
            msg = 'delete-photo?';
        }
        dialog.show('', msg, {
            title: 'cancel',
            callback: closeDialog
        }, {
            title: 'delete',
            callback: deleteItem,
            recommend: false
        });
        function closeDialog() {
            dialog.hide();
        }
        function deleteItem() {
            dialog.hide();
            if (item.isVideo) {
                self.app.emit('previewgallery:deletevideo', filepath);
            } else {
                self.app.emit('previewgallery:deletepicture', filepath);
            }
        }
    };
    PreviewGalleryController.prototype.updatePreviewGallery = function (items) {
        if (items) {
            this.items = items;
        }
        if (this.items.length === 0) {
            this.closePreview();
        } else {
            if (this.currentItemIndex === this.items.length) {
                this.currentItemIndex = this.items.length - 1;
            }
            var isOpened = this.view ? true : false;
            if (isOpened) {
                this.previewItem();
            }
        }
    };
    PreviewGalleryController.prototype.handleSwipe = function (direction) {
        if (direction === 'left') {
            this.next();
        } else if (direction === 'right') {
            this.previous();
        }
    };
    PreviewGalleryController.prototype.next = function () {
        if (this.currentItemIndex < this.items.length - 1) {
            this.currentItemIndex += 1;
            this.previewItem();
        }
    };
    PreviewGalleryController.prototype.previous = function () {
        if (this.currentItemIndex > 0) {
            this.currentItemIndex -= 1;
            this.previewItem();
        }
    };
    PreviewGalleryController.prototype.previewItem = function () {
        var index = this.currentItemIndex;
        var item = this.items[index];
        this.view.updateCountText(index + 1, this.items.length);
        if (item.isVideo) {
            this.view.showVideo(item);
        } else {
            this.view.showImage(item);
        }
    };
});