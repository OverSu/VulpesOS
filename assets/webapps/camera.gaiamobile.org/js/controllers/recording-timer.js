define([
    'require',
    'exports',
    'module',
    'debug',
    'views/recording-timer'
], function (require, exports, module) {
    'use strict';
    var debug = require('debug')('controller:recording-timer');
    var RecordingTimerView = require('views/recording-timer');
    module.exports = function (app) {
        return new RecordingTimerController(app);
    };
    module.exports.RecordingTimerController = RecordingTimerController;
    function RecordingTimerController(app) {
        this.onRecordingChange = this.onRecordingChange.bind(this);
        this.app = app;
        this.createView();
        this.bindEvents();
        debug('initialized');
    }
    RecordingTimerController.prototype.createView = function () {
        this.view = this.app.view || new RecordingTimerView();
        this.view.appendTo(this.app.el);
    };
    RecordingTimerController.prototype.bindEvents = function () {
        this.app.on('change:recording', this.onRecordingChange);
        this.app.on('camera:recorderTimeUpdate', this.view.value);
        debug('events bound');
    };
    RecordingTimerController.prototype.onRecordingChange = function (recording) {
        debug('recording: %s', recording);
        if (!recording) {
            this.view.hide();
            return;
        }
        this.view.value(0);
        this.view.show();
    };
});