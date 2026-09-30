define([
    'require',
    'exports',
    'module',
    'lib/prepare-preview-blob',
    'debug',
    'views/confirm',
    'lib/bind-all'
], function (require, exports, module) {
    var prepareBlob = require('lib/prepare-preview-blob');
    var debug = require('debug')('controller:confirm');
    var ConfirmView = require('views/confirm');
    var bindAll = require('lib/bind-all');
    module.exports = function (options) {
        return new ConfirmController(options);
    };
    module.exports.ConfirmController = ConfirmController;
    function ConfirmController(app) {
        this.app = app;
        this.settings = app.settings;
        this.activity = app.activity;
        this.camera = app.camera;
        this.container = app.el;
        this.ConfirmView = app.ConfirmView || ConfirmView;
        this.prepareBlob = app.prepareBlob || prepareBlob;
        bindAll(this);
        this.bindEvents();
        debug('initialized');
    }
    ConfirmController.prototype.renderView = function () {
        if (!this.activity.pick) {
            return;
        }
        if (!this.view) {
            this.view = new this.ConfirmView();
            this.view.maxPreviewSize = window.CONFIG_MAX_IMAGE_PIXEL_SIZE;
            this.view.render().appendTo(this.container);
            this.view.once('click:select', this.onSelectMedia);
            this.view.on('click:retake', this.onRetakeMedia);
            this.view.on('loadingvideo', this.app.firer('busy'));
            this.view.on('playingvideo', this.app.firer('ready'));
        }
        this.view.show();
        this.app.set('confirmViewVisible', true);
    };
    ConfirmController.prototype.bindEvents = function () {
        this.camera.on('newimage', this.renderView);
        this.camera.on('change:recording', this.onRecordingChange);
        this.app.on('newmedia', this.onNewMedia);
    };
    ConfirmController.prototype.onRecordingChange = function (recording) {
        if (!this.activity.pick) {
            return;
        }
        if (recording === 'starting') {
            this.recording = true;
        } else if (recording === 'error') {
            this.recording = false;
        } else if (recording === 'stopped' && this.recording) {
            this.renderView();
        }
    };
    ConfirmController.prototype.onNewMedia = function (newMedia) {
        if (!this.activity.pick) {
            return;
        }
        this.newMedia = newMedia;
        if (newMedia.isVideo) {
            this.view.showVideo(newMedia);
        } else {
            this.prepareBlob(this.newMedia.blob, this.view.showImage);
        }
    };
    ConfirmController.prototype.onSelectMedia = function () {
        this.app.emit('confirm:selected', this.newMedia);
    };
    ConfirmController.prototype.onRetakeMedia = function () {
        this.view.hide();
        this.view.clearMediaFrame();
        this.app.set('confirmViewVisible', false);
    };
});