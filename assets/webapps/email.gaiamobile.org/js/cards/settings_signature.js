define([
    'require',
    'tmpl!./sig/save_signature.html',
    'cards',
    './base_card',
    'template!./settings_signature.html',
    './editor_mixins'
], function (require) {
    var backFormNode = require('tmpl!./sig/save_signature.html'), cards = require('cards'), trailingRegExp = /\s+$/;
    return [
        require('./base_card')(require('template!./settings_signature.html')),
        require('./editor_mixins'),
        {
            onArgs: function (args) {
                this.account = args.account;
                this.identity = this.account.identities[0];
                this._bindEditor(this.signatureNode);
                this.populateEditor(this.identity.signature || '');
            },
            getTextFromEditor: function () {
                var text = this.fromEditor().replace(trailingRegExp, '');
                return text;
            },
            goBack: function () {
                cards.removeCardAndSuccessors(this, 'animate', 1);
            },
            onBack: function () {
                var signature = this.getTextFromEditor();
                if (signature === this.identity.signature) {
                    this.goBack();
                    return;
                }
                var menu = backFormNode.cloneNode(true);
                this._savePromptMenu = menu;
                cards.setStatusColor(menu);
                document.body.appendChild(menu);
                var formSubmit = function (evt) {
                    cards.setStatusColor();
                    document.body.removeChild(menu);
                    this._savePromptMenu = null;
                    switch (evt.explicitOriginalTarget.id) {
                    case 'sig-save':
                        this.identity.modifyIdentity({ signature: signature });
                        this.goBack();
                        break;
                    case 'sig-discard':
                        this.goBack();
                        break;
                    case 'sig-cancel':
                        break;
                    }
                    return false;
                }.bind(this);
                menu.addEventListener('submit', formSubmit);
            },
            onClickDone: function () {
                var signature = this.getTextFromEditor();
                if (signature !== this.identity.signature) {
                    this.identity.modifyIdentity({ signature: signature });
                }
                this.onBack();
            },
            onCardVisible: function () {
                var selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    selection.removeAllRanges();
                }
                var node = this.signatureNode.lastChild;
                if (node) {
                    var range = document.createRange();
                    range.setStartAfter(node);
                    range.setEndAfter(node);
                    selection.addRange(range);
                }
                this.signatureNode.focus();
            },
            die: function () {
            }
        }
    ];
});