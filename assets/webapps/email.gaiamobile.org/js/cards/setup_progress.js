define([
    'require',
    'api',
    'cards',
    'cards/oauth2/fetch',
    './base_card',
    'template!./setup_progress.html'
], function (require) {
    var MailAPI = require('api'), cards = require('cards'), oauthFetch = require('cards/oauth2/fetch');
    return [
        require('./base_card')(require('template!./setup_progress.html')),
        {
            onArgs: function (args) {
                this.args = args;
                this.callingCard = args.callingCard;
                this.creationInProcess = true;
                this.pushedSecondaryCard = false;
                this.cardHasBeenShown = false;
                this.createCanceled = false;
            },
            extraClasses: [
                'anim-fade',
                'anim-overlay'
            ],
            cancelCreation: function () {
                if (!this.creationInProcess) {
                    return;
                }
            },
            onCardVisible: function () {
                if (this.cardHasBeenShown) {
                    if (this.pushedSecondaryCard) {
                        setTimeout(this.onBack.bind(this), 100);
                    }
                } else {
                    this.cardHasBeenShown = true;
                    if (!this.args.password) {
                        this.learnAbout();
                    } else {
                        this.tryCreate();
                    }
                }
            },
            onBack: function (e) {
                if (e) {
                    e.preventDefault();
                }
                this.cancelCreation();
                this.createCanceled = true;
                cards.removeCardAndSuccessors(this, 'animate', 1);
            },
            learnAbout: function () {
                MailAPI.learnAboutAccount({ emailAddress: this.args.emailAddress }, function (details) {
                    var args = this.args;
                    args.configInfo = details.configInfo;
                    var result = details.result;
                    if (result === 'need-oauth2') {
                        oauthFetch(details.configInfo.oauth2Settings, { login_hint: args.emailAddress }).then(function (response) {
                            if (response.status === 'cancel') {
                                this.onBack();
                            } else if (response.status === 'success') {
                                args.configInfo.oauth2Secrets = response.secrets;
                                args.configInfo.oauth2Tokens = response.tokens;
                                this.tryCreate();
                            } else {
                                console.error('Unknown oauthFetch status: ' + response.status);
                                this._divertToManualConfig();
                            }
                        }.bind(this), this.onCreationError.bind(this));
                    } else if (result === 'need-password') {
                        this.pushedSecondaryCard = true;
                        cards.pushCard('setup_account_password', 'animate', {
                            displayName: args.displayName,
                            emailAddress: args.emailAddress
                        }, 'right');
                    } else {
                        this._divertToManualConfig();
                    }
                }.bind(this));
            },
            _divertToManualConfig: function () {
                this.pushedSecondaryCard = true;
                cards.pushCard('setup_manual_config', 'animate', {
                    displayName: this.args.displayName,
                    emailAddress: this.args.emailAddress
                }, 'right');
            },
            tryCreate: function () {
                var args = this.args;
                var options = {
                    displayName: args.displayName,
                    emailAddress: args.emailAddress,
                    password: args.password,
                    outgoingPassword: args.outgoingPassword
                };
                MailAPI.tryToCreateAccount(options, args.configInfo || null, function (err, errDetails, account) {
                    this.creationInProcess = false;
                    if (err) {
                        this.onCreationError(err, errDetails);
                    } else {
                        if (this.createCanceled) {
                            account.deleteAccount();
                        } else {
                            this.onCreationSuccess(account);
                        }
                    }
                }.bind(this));
            },
            onCreationError: function (err, errDetails) {
                this.callingCard.showError(err, errDetails);
                cards.removeCardAndSuccessors(this, 'animate', 1);
            },
            onCreationSuccess: function (account) {
                cards.pushCard('setup_account_prefs', 'animate', { account: account });
            },
            die: function () {
                this.cancelCreation();
            }
        }
    ];
});