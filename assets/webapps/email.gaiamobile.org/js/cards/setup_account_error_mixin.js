define([
    'require',
    './setup_l10n_map',
    'l10n!'
], function (require) {
    var SETUP_ERROR_L10N_ID_MAP = require('./setup_l10n_map'), mozL10n = require('l10n!');
    return {
        showError: function (errName, errDetails) {
            this.errorRegionNode.classList.remove('collapsed');
            var errorStr = SETUP_ERROR_L10N_ID_MAP.hasOwnProperty(errName) ? SETUP_ERROR_L10N_ID_MAP[errName] : SETUP_ERROR_L10N_ID_MAP.unknown;
            mozL10n.setAttributes(this.errorMessageNode, errorStr, errDetails);
            this.scrollBelowNode.scrollTop = 0;
        }
    };
});