define([
    'require',
    'l10n!',
    'cards'
], function (require) {
    var mozL10n = require('l10n!'), cards = require('cards');
    return {
        extraClasses: [
            'anim-fade',
            'anim-overlay'
        ],
        onArgs: function (args) {
            this.account = args.account;
            this.whichSide = args.whichSide;
            this.restoreCard = args.restoreCard;
            var type = this.account.type;
            if (type === 'imap+smtp' || type === 'pop3+smtp') {
                var l10nString = null;
                if (this.whichSide === 'incoming') {
                    if (type === 'imap+smtp') {
                        l10nString = 'settings-account-clarify-imap';
                    } else {
                        l10nString = 'settings-account-clarify-pop3';
                    }
                } else {
                    l10nString = 'settings-account-clarify-smtp';
                }
                mozL10n.setAttributes(this.accountNode, l10nString, { 'account-name': this.account.name });
            }
        },
        onUsePassword: function () {
            var password = this.passwordNode.value;
            if (password) {
                this.account.modifyAccount(this.whichSide === 'incoming' ? { password: password } : { outgoingPassword: password }, this.proceed.bind(this));
            } else {
                this.proceed();
            }
        },
        proceed: function () {
            this.account.clearProblems();
            cards.removeCardAndSuccessors(this, 'animate', 1, this.restoreCard);
        },
        die: function () {
        }
    };
});