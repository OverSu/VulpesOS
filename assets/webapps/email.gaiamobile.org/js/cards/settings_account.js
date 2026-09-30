define([
    'require',
    'tmpl!./tng/account_settings_server.html',
    'tmpl!./tng/account_delete_confirm.html',
    'evt',
    'l10n!',
    'cards',
    'confirm_dialog',
    './base_card',
    'template!./settings_account.html',
    './account_prefs_mixins'
], function (require) {
    var tngAccountSettingsServerNode = require('tmpl!./tng/account_settings_server.html'), tngAccountDeleteConfirmNode = require('tmpl!./tng/account_delete_confirm.html'), evt = require('evt'), mozL10n = require('l10n!'), cards = require('cards'), ConfirmDialog = require('confirm_dialog');
    return [
        require('./base_card')(require('template!./settings_account.html')),
        require('./account_prefs_mixins'),
        {
            onArgs: function (args) {
                this.account = args.account;
                this.identity = this.account.identities[0];
                this.headerLabel.textContent = args.account.name;
                this._bindPrefs('tng-account-check-interval', 'tng-notify-mail', 'tng-sound-onsend', 'tng-signature-input', 'signature-button');
                this.accountNameNode.textContent = this.identity && this.identity.name || this.account.name;
                this.accountTypeNode.textContent = this.account.type === 'activesync' ? 'ActiveSync' : this.account.type === 'imap+smtp' ? 'IMAP+SMTP' : 'POP3+SMTP';
                if (this.account.isDefault) {
                    this.defaultInputNode.disabled = true;
                    this.defaultInputNode.checked = true;
                } else {
                    this.defaultLabelNode.addEventListener('click', this.onChangeDefaultAccount.bind(this), false);
                }
                if (this.account.type === 'activesync') {
                    this.synchronizeNode.value = this.account.syncRange;
                } else {
                    this.syncSettingNode.parentNode.removeChild(this.syncSettingNode);
                }
                this.account.servers.forEach(function (server, index) {
                    var serverNode = tngAccountSettingsServerNode.cloneNode(true);
                    var serverLabel = serverNode.querySelector('.tng-account-server-label');
                    mozL10n.setAttributes(serverLabel, 'settings-' + server.type + '-label');
                    serverLabel.addEventListener('click', this.onClickServers.bind(this, index), false);
                    this.serversContainer.appendChild(serverNode);
                }.bind(this));
                var credL10nId = 'settings-account-userpass';
                if (this.account.authMechanism === 'oauth2') {
                    credL10nId = 'settings-account-useroauth2';
                }
                mozL10n.setAttributes(this.accountCredNode, credL10nId);
            },
            onBack: function () {
                cards.removeCardAndSuccessors(this, 'animate', 1);
            },
            onCardVisible: function () {
                this.updateSignatureButton();
            },
            onClickCredentials: function () {
                cards.pushCard('settings_account_credentials', 'animate', { account: this.account }, 'right');
            },
            onClickServers: function (index) {
                cards.pushCard('settings_account_servers', 'animate', {
                    account: this.account,
                    index: index
                }, 'right');
            },
            onChangeDefaultAccount: function (event) {
                event.stopPropagation();
                if (event.preventBubble) {
                    event.preventBubble();
                }
                if (!this.defaultInputNode.disabled) {
                    this.defaultInputNode.disabled = true;
                    this.defaultInputNode.checked = true;
                    this.account.modifyAccount({ setAsDefault: true });
                }
            },
            onChangeSynchronize: function (event) {
                this.account.modifyAccount({ syncRange: event.target.value });
            },
            onDelete: function () {
                var account = this.account;
                var dialog = tngAccountDeleteConfirmNode.cloneNode(true);
                var content = dialog.getElementsByTagName('p')[0];
                mozL10n.setAttributes(content, 'settings-account-delete-prompt', { account: account.name.replace(/@/, '\u200B@\u200B') });
                ConfirmDialog.show(dialog, {
                    id: 'account-delete-ok',
                    handler: function () {
                        account.deleteAccount();
                        evt.emit('accountDeleted', account);
                    }
                }, {
                    id: 'account-delete-cancel',
                    handler: null
                });
            },
            die: function () {
            }
        }
    ];
});