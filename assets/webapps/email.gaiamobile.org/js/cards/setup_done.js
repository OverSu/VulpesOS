define([
    'require',
    'evt',
    './base_card',
    'template!./setup_done.html'
], function (require) {
    var evt = require('evt');
    return [
        require('./base_card')(require('template!./setup_done.html')),
        {
            onAddAnother: function () {
                evt.emit('addAccount');
            },
            onShowMail: function () {
                evt.emit('showLatestAccount');
            },
            die: function () {
            }
        }
    ];
});