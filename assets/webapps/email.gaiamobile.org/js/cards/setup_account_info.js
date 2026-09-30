define([
    'require',
    'exports',
    'module',
    'evt',
    'l10n!',
    'cards',
    'html_cache',
    'form_navigation',
    './base_card',
    'template!./setup_account_info.html',
    './setup_account_error_mixin'
], function (require, exports, module) {
    var evt = require('evt'), mozL10n = require('l10n!'), cards = require('cards'), htmlCache = require('html_cache'), FormNavigation = require('form_navigation');
    return [
        require('./base_card')(require('template!./setup_account_info.html')),
        require('./setup_account_error_mixin'),
        {
            createdCallback: function () {
                htmlCache.cloneAndSave(module.id, this);
                this.formNavigation = new FormNavigation({
                    formElem: this.formNode,
                    onLast: this.onNext.bind(this)
                });
                this.needsFocus = true;
            },
            onArgs: function (args) {
                if (args.allowBack) {
                    this.backButton.classList.remove('collapsed');
                }
                if (args.launchedFromActivity) {
                    this.errorRegionNode.classList.remove('collapsed');
                    mozL10n.setAttributes(this.errorMessageNode, 'setup-empty-account-message');
                }
            },
            onCardVisible: function () {
                if (this.needsFocus) {
                    this.nameNode.focus();
                    this.needsFocus = false;
                }
            },
            onBack: function (event) {
                evt.emit('setupAccountCanceled', this);
            },
            onNext: function (event) {
                event.preventDefault();
                htmlCache.reset();
                cards.pushCard('setup_progress', 'animate', {
                    displayName: this.nameNode.value,
                    emailAddress: this.emailNode.value,
                    callingCard: this
                }, 'right');
            },
            onInfoInput: function (event) {
                this.nextButton.disabled = this.manualConfig.disabled = !this.formNode.checkValidity();
            },
            onClickManualConfig: function (event) {
                event.preventDefault();
                cards.pushCard('setup_manual_config', 'animate', {
                    displayName: this.nameNode.value,
                    emailAddress: this.emailNode.value
                }, 'right');
            },
            die: function () {
                this.formNavigation = null;
            }
        }
    ];
});