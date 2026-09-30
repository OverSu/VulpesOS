define([
    'require',
    './base_card',
    'template!./setup_fix_password.html',
    './setup_fix_mixin'
], function (require) {
    return [
        require('./base_card')(require('template!./setup_fix_password.html')),
        require('./setup_fix_mixin')
    ];
});