define([
    'require',
    'mix',
    'cards',
    'form_navigation',
    './base_card',
    'template!./setup_account_password.html',
    './setup_account_error_mixin'
], function (require) {
    var mix = require('mix'), cards = require('cards'), FormNavigation = require('form_navigation');
    function bindFormNavigation(instance) {
        return new FormNavigation({
            formElem: instance.formNode,
            onLast: instance.onNext.bind(instance)
        });
    }
    return [
        require('./base_card')(require('template!./setup_account_password.html')),
        require('./setup_account_error_mixin'),
        {
            onArgs: function (args) {
                this.args = args;
                this.emailAddress = args.emailAddress;
                this.emailNode.textContent = this.emailAddress;
                this.needsFocus = true;
                bindFormNavigation(this);
            },
            onCardVisible: function () {
                if (this.needsFocus) {
                    this.passwordNode.focus();
                    this.needsFocus = false;
                }
            },
            onBack: function (event) {
                cards.removeCardAndSuccessors(this, 'animate', 1);
            },
            onNext: function (event) {
                event.preventDefault();
                this.args.password = this.passwordNode.value;
                cards.pushCard('setup_progress', 'animate', mix({ callingCard: this }, this.args), 'right');
            },
            onInfoInput: function (event) {
                this.nextButton.disabled = !this.formNode.checkValidity();
            },
            die: function () {
            }
        }
    ];
});