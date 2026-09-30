define([
    'require',
    'exports',
    'module',
    'debug',
    'views/countdown',
    'lib/bind-all'
], function (require, exports, module) {
    'use strict';
    var debug = require('debug')('controller:countdown');
    var CountdownView = require('views/countdown');
    var bindAll = require('lib/bind-all');
    module.exports = function (app) {
        return new CountdownController(app);
    };
    module.exports.CountdownController = CountdownController;
    function CountdownController(app) {
        bindAll(this);
        this.app = app;
        this.view = app.views.countdown || new CountdownView();
        this.view.appendTo(app.el);
        this.bindEvents();
        debug('initialized');
    }
    CountdownController.prototype.bindEvents = function () {
        this.app.on('countdown:started', this.start);
        this.app.on('countdown:tick', this.update);
        this.app.on('countdown:ended', this.clear);
    };
    CountdownController.prototype.start = function (seconds) {
        this.update(seconds);
        this.view.show();
        debug('started');
    };
    CountdownController.prototype.update = function (seconds) {
        if (seconds < 1) {
            seconds = '';
        }
        var immanent = seconds <= 3;
        this.view.set(seconds).setImmanent(immanent);
        if (immanent && seconds > 0) {
            this.app.emit('countdown:immanent');
        }
    };
    CountdownController.prototype.clear = function () {
        this.view.hide(this.view.reset);
    };
});