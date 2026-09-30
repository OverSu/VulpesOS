define(['require'], function (require) {
    function FormNavigation(options) {
        function extend(destination, source) {
            for (var property in source) {
                destination[property] = source[property];
            }
            return destination;
        }
        if (!options.formElem) {
            throw new Error('The form element should be defined.');
        }
        var self = this;
        this.options = extend({
            formElem: null,
            checkFormValidity: function checkFormValidity() {
                return self.options.formElem.checkValidity();
            },
            onLast: function () {
            }
        }, options);
        this.options.formElem.addEventListener('keypress', this.onKeyPress.bind(this));
        this.options.formElem.addEventListener('click', this.onClick.bind(this));
    }
    FormNavigation.prototype = {
        onKeyPress: function formNav_onKeyPress(event) {
            if (event.keyCode === 13) {
                var nextInput = this.focusNextInput(event);
                if (!nextInput && this.options.checkFormValidity()) {
                    this.options.onLast(event);
                }
            }
        },
        onClick: function formNav_onClick(event) {
            if (event.target.type === 'reset') {
                var formValidity = this.options.checkFormValidity();
                var buttonElems = this.options.formElem.getElementsByTagName('button');
                for (var i = 0; i < buttonElems.length; i++) {
                    var button = buttonElems[i];
                    if (button.type !== 'reset') {
                        button.disabled = !formValidity;
                    }
                }
            }
        },
        focusNextInput: function formNav_focusNextInput(event) {
            var currentInput = event.target;
            var inputElems = this.options.formElem.getElementsByTagName('input');
            var currentInputFound = false;
            for (var i = 0; i < inputElems.length; i++) {
                var input = inputElems[i];
                if (currentInput === input) {
                    currentInputFound = true;
                    continue;
                } else if (!currentInputFound) {
                    continue;
                }
                if (input.type === 'hidden' || input.type === 'button') {
                    continue;
                }
                input.focus();
                if (document.activeElement !== input) {
                    continue;
                }
                return input;
            }
            currentInput.blur();
            return null;
        }
    };
    return FormNavigation;
});