define([
    'require',
    'exports',
    'module',
    'debug',
    'lib/sounds'
], function (require, exports, module) {
    'use strict';
    var debug = require('debug')('controller:sounds');
    var Sounds = require('lib/sounds');
    module.exports = function (app) {
        return new SoundsController(app);
    };
    module.exports.SoundsController = SoundsController;
    function SoundsController(app) {
        var list = app.settings.sounds.get('list');
        this.sounds = new Sounds(list);
        this.app = app;
        this.bindEvents();
        debug('initialized');
    }
    SoundsController.prototype.bindEvents = function () {
        this.app.on('change:recording', this.onRecordingChange.bind(this));
        this.app.on('camera:willrecord', this.sounds.player('recordingStart'));
        this.app.on('camera:shutter', this.sounds.player('shutter'));
        this.app.on('countdown:immanent', this.sounds.player('countdown'));
    };
    SoundsController.prototype.onRecordingChange = function (recording) {
        if (!recording) {
            this.sounds.play('recordingEnd');
        }
    };
});