define([
    'require',
    './oauth2/fetch',
    'cards',
    './base_card',
    'template!./setup_fix_oauth2.html'
], function (require) {
    var oauthFetch = require('./oauth2/fetch'), cards = require('cards');
    return [
        require('./base_card')(require('template!./setup_fix_oauth2.html')),
        {
            extraClasses: [
                'anim-fade',
                'anim-overlay'
            ],
            onArgs: function (args) {
                this.account = args.account;
                this.restoreCard = args.restoreCard;
                this.oauth2Name.textContent = this.account.name;
            },
            die: function () {
            },
            onReauth: function (event) {
                event.stopPropagation();
                event.preventDefault();
                var oauth2 = this.account._wireRep.credentials.oauth2;
                oauthFetch(oauth2, { login_hint: this.account.username }).then(function (response) {
                    if (response.status === 'cancel') {
                        this.delayedClose();
                    } else if (response.status === 'success') {
                        this.account.modifyAccount({ oauthTokens: response.tokens });
                        this.account.clearProblems();
                        this.delayedClose();
                    } else {
                        console.error('Unknown oauthFetch status: ' + response.status);
                        this.delayedClose();
                    }
                }.bind(this));
            },
            delayedClose: function () {
                setTimeout(this.close.bind(this), 100);
            },
            close: function (event) {
                if (event) {
                    event.stopPropagation();
                    event.preventDefault();
                }
                cards.removeCardAndSuccessors(this, 'animate', 1, this.restoreCard);
            }
        }
    ];
});