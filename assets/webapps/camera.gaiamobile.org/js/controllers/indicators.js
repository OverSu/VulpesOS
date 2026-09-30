define([
    'require',
    'exports',
    'module',
    'debug',
    'views/indicators'
], function (require, exports, module) {
    'use strict';
    var debug = require('debug')('controller:indicators');
    var IndicatorsView = require('views/indicators');
    module.exports = function (app) {
        return new IndicatorsController(app);
    };
    module.exports.IndicatorsController = IndicatorsController;
    function IndicatorsController(app) {
        this.app = app;
        this.settings = app.settings;
        this.configure = this.configure.bind(this);
        this.createView();
        this.configure();
        this.bindEvents();
        debug('initialized');
    }
    IndicatorsController.prototype.createView = function () {
        debug('create view');
        this.view = this.app.views.indicators || new IndicatorsView();
        this.view.appendTo(this.app.el);
        debug('view created');
    };
    IndicatorsController.prototype.bindEvents = function () {
        this.settings.countdown.on('change:selected', this.view.setter('countdown'));
        this.settings.mode.on('change:selected', this.view.setter('mode'));
        this.settings.hdr.on('change:selected', this.view.setter('hdr'));
        this.app.on('change:batteryStatus', this.view.setter('battery'));
        this.app.on('change:recording', this.view.setter('recording'));
        this.app.on('settings:configured', this.configure);
        this.app.on('settings:opened', this.view.setter('ariaHidden', true));
        this.app.on('settings:closed', this.view.setter('ariaHidden', false));
        this.app.on('previewgallery:opened', this.view.hide);
        this.app.on('previewgallery:closed', this.view.show);
        debug('events bound');
    };
    IndicatorsController.prototype.configure = function () {
        debug('configuring');
        this.view.set('hdr', this.settings.hdr.selected('key'));
        this.view.set('countdown', this.settings.countdown.selected('key'));
        this.view.set('battery', this.app.get('batteryStatus'));
        debug('configured');
    };
});