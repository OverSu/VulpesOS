define('tmpl!cards/cmp/attachment_item.html', ['tmpl'], function (tmpl) {
    return tmpl.toDom('<li class="cmp-attachment-item">\n  <span class="cmp-attachment-icon" role="presentation"></span>\n  <span class="cmp-attachment-fileinfo">\n    <span dir="auto" class="cmp-attachment-filename"></span>\n    <span class="cmp-attachment-filesize"></span>\n  </span>\n  <span class="cmp-attachment-remove" role="button"\n        data-l10n-id="compose-attachment-remove"></span>\n</li>');
});
define('tmpl!cards/cmp/contact_menu.html', ['tmpl'], function (tmpl) {
    return tmpl.toDom('<form class="cmp-contact-menu" role="dialog" data-type="action">\n\xA0 <header></header>\n  <menu>\n    <button class="cmp-contact-menu-edit" data-l10n-id="message-edit-menu-edit">\n    </button>\n  \xA0 <button class="cmp-contact-menu-delete" data-l10n-id="message-edit-menu-delete">\n    </button>\n    <span class="last-button-container">\n      <button class="cmp-contact-menu-cancel" data-l10n-id="message-multiedit-cancel">\n      </button>\n    </span>\n  </menu>\n</form>\n');
});
define('tmpl!cards/cmp/draft_menu.html', ['tmpl'], function (tmpl) {
    return tmpl.toDom('<form role="dialog" class="cmp-draft-menu" data-type="action">\n  <menu>\n    <button id="cmp-draft-save" data-l10n-id="compose-draft-save"></button>\n    <button id="cmp-draft-discard" class="danger" data-l10n-id="compose-delete-confirm"></button>\n    <span class="last-button-container">\n      <button id="cmp-draft-cancel" data-l10n-id="message-multiedit-cancel"></button>\n    </span>\n  </menu>\n</form>\n');
});
define('tmpl!cards/cmp/peep_bubble.html', ['tmpl'], function (tmpl) {
    return tmpl.toDom('<div class="cmp-peep-bubble peep-bubble" dir="auto" role="button">\n  <span class="cmp-peep-name"></span>\n  <span class="cmp-peep-address collapsed"></span>\n</div>\n');
});
define('tmpl!cards/cmp/invalid_addresses.html', ['tmpl'], function (tmpl) {
    return tmpl.toDom('<form role="dialog" data-type="confirm">\n  <section>\n    <h1 data-l10n-id="compose-invalid-addresses-title"></h1>\n    <p data-l10n-id="compose-invalid-addresses-description"></p>\n  </section>\n  <menu>\n    <button id="cmp-confirm-invalid-addresses"\n            class="confirm-dialog-ok full recommend"\n            data-l10n-id="dialog-button-ok"></button>\n  </menu>\n</form>\n');
});
define('tmpl!cards/msg/attach_confirm.html', ['tmpl'], function (tmpl) {
    return tmpl.toDom('<form role="dialog" class="msg-attach-confirm" data-type="confirm">\n  <section>\n    <h1></h1>\n    <p></p>\n  </section>\n  <menu>\n    <button id="msg-attach-ok" class="full" data-l10n-id="dialog-button-ok"></button>\n  </menu>\n</form>');
});
define('marquee', [], function () {
    var Marquee = {
        timingFunction: [
            'linear',
            'ease'
        ],
        setup: function marquee_setup(text, headerNode) {
            this._headerNode = headerNode;
            this._headerWrapper = document.getElementById('marquee-h-wrapper');
            if (!this._headerWrapper) {
                this._headerWrapper = document.createElement('div');
                this._headerWrapper.id = 'marquee-h-wrapper';
                this._headerNode.appendChild(this._headerWrapper);
            }
            var headerText = document.getElementById('marquee-h-text');
            if (!headerText) {
                headerText = document.createElement('div');
                headerText.id = 'marquee-h-text';
                this._headerWrapper.dir = 'auto';
                this._headerWrapper.appendChild(headerText);
            }
            headerText.textContent = text;
        },
        activate: function marquee_activate(behavior, timingFun) {
            if (!this._headerNode || !this._headerWrapper) {
                return;
            }
            var mode = behavior || 'scroll';
            var tf = timingFun || null;
            var timing = Marquee.timingFunction.indexOf(tf) >= 0 ? tf : 'linear';
            var marqueeCssClass = 'marquee';
            var titleText = document.getElementById('marquee-h-text');
            var cssClass, width;
            if (this._headerWrapper.clientWidth < this._headerWrapper.scrollWidth) {
                this._marqueeCssClassList = [];
                switch (mode) {
                case 'scroll':
                    cssClass = marqueeCssClass + '-rtl';
                    width = this._headerWrapper.scrollWidth;
                    titleText.style.width = width + 'px';
                    titleText.classList.add(cssClass + '-start-' + timing);
                    this._marqueeCssClassList.push(cssClass + '-start-' + timing);
                    var self = this;
                    titleText.addEventListener('animationend', function () {
                        titleText.classList.remove(cssClass + '-start-' + timing);
                        this._marqueeCssClassList.pop();
                        var visibleWidth = self._headerWrapper.clientWidth + 'px';
                        titleText.style.transform = 'translateX(' + visibleWidth + ')';
                        titleText.classList.add(cssClass);
                        this._marqueeCssClassList.push(cssClass);
                    });
                    break;
                case 'alternate':
                    var dirSuffix = '';
                    if (window.getComputedStyle(titleText).direction === 'rtl') {
                        dirSuffix = '-rtl';
                    }
                    timing += dirSuffix;
                    cssClass = marqueeCssClass + '-alt-';
                    width = this._headerWrapper.scrollWidth - this._headerWrapper.clientWidth;
                    titleText.style.width = width + 'px';
                    titleText.classList.add(cssClass + timing);
                    break;
                }
            } else {
                if (!this._marqueeCssClassList) {
                    return;
                }
                for (var titleCssClass in this._marqueeCssClassList) {
                    titleText.classList.remove(titleCssClass);
                }
                titleText.style.transform = '';
            }
        }
    };
    return Marquee;
});
define('mime_to_class', [], function () {
    return function mimeToClass(mimeType) {
        mimeType = mimeType || '';
        return 'mime-' + (mimeType.split('/')[0] || '');
    };
});
define('file_display', [
    'require',
    'l10n!'
], function (require) {
    var mozL10n = require('l10n!');
    return {
        fileSize: function (node, sizeInBytes) {
            var kilos = Math.ceil(sizeInBytes / 1024);
            mozL10n.setAttributes(node, 'attachment-size-kib', { kilobytes: kilos });
        }
    };
});
define('tmpl!cards/cmp/autocomplete_item.html', ['tmpl'], function (tmpl) {
    return tmpl.toDom('<li class="cmp-autocomplete-item">\n  <!-- Using an a tag so that screen reader properly activates a selection\n  when tapped. Using a div meant the ul element got the click. To get proper full bleed on the active/selected color, need to use another div inside\n  the a tag to get that while keeping the margins on text and border. -->\n  <a class="cmp-autocomplete-item-link" href="#">\n    <div class="cmp-autocomplete-item-details">\n      <span class="cmp-autocomplete-name" dir="auto" aria-hidden="true"></span>\n      <span class="cmp-autocomplete-email" dir="auto" aria-hidden="true"></span>\n    </div>\n  </a>\n</li>\n');
});
define('regExpEscape', [], function () {
    return function regExpEscape(str) {
        return str.replace(/[\\^$*+?.()|[\]{}]/g, '\\$&');
    };
});
define('cards/cmp/autocomplete', [
    'require',
    'shared/js/gesture_detector',
    'tmpl!./autocomplete_item.html',
    'l10n!',
    'regExpEscape',
    'transition_end',
    '../base'
], function (require) {
    var GestureDetector = require('shared/js/gesture_detector'), itemTemplate = require('tmpl!./autocomplete_item.html'), mozL10n = require('l10n!'), regExpEscape = require('regExpEscape'), transitionEnd = require('transition_end'), validTypes = {
            email: true,
            text: true
        };
    function formatMatchString(queryRegExp, text, node) {
        var match = queryRegExp.exec(text);
        if (match) {
            var index = match.index, endIndex = index + queryRegExp.source.length;
            var startString = text.substring(0, index);
            if (startString) {
                node.appendChild(document.createTextNode(startString));
            }
            var matchString = text.substring(index, endIndex);
            if (matchString) {
                var span = document.createElement('span');
                span.classList.add('highlight');
                span.textContent = matchString;
                node.appendChild(span);
            }
            var endString = text.substring(endIndex);
            if (endString) {
                node.appendChild(document.createTextNode(endString));
            }
        } else {
            node.textContent = text;
        }
    }
    function findAncestorWithClass(node, className) {
        for (; node; node = node.parentNode) {
            if (node.classList && node.classList.contains(className)) {
                return node;
            }
        }
        return null;
    }
    function getAutocompleteItem(node) {
        return findAncestorWithClass(node, 'cmp-autocomplete-item');
    }
    return [
        require('../base')(),
        {
            createdCallback: function () {
                this.lastTranslateY = 0;
                this.inputAreaTranslated = Promise.resolve();
                this.runQuery = this.runQuery.bind(this);
                this.onFocus = this.onFocus.bind(this);
                this.onDocumentEvent = this.onDocumentEvent.bind(this);
                this.onInput = this.onInput.bind(this);
                this.list = this.querySelector('.cmp-autocomplete-list');
                if (!this.list) {
                    this.list = document.createElement('ul');
                    this.list.classList.add('cmp-autocomplete-list');
                    this.appendChild(this.list);
                }
                this.list.addEventListener('keydown', this.onMatchKeyDown.bind(this));
                this.list.addEventListener('click', this.onMatchClick.bind(this));
                this.list.innerHTML = '';
                this.hideList();
                var parentNode = this;
                while (parentNode = parentNode.parentNode) {
                    if (parentNode.classList.contains('cmp-autocomplete-origin')) {
                        this.originNode = parentNode;
                        break;
                    }
                }
                this.inputArea = this.originNode.querySelector('.cmp-autocomplete-input-list');
                transitionEnd(this.inputArea, this._translateYTransitionEnd.bind(this));
                var nodes = this.inputArea.querySelectorAll('input');
                Array.from(nodes, function (inputNode) {
                    if (!validTypes.hasOwnProperty(inputNode.type)) {
                        return;
                    }
                    inputNode.classList.add('cmp-autocomplete-input');
                    inputNode.addEventListener('focus', this.onFocus);
                    inputNode.addEventListener('input', this.onInput);
                }, this);
                this.detector = new GestureDetector(this.inputArea);
                this.inputArea.addEventListener('pan', event => {
                    this.hide();
                });
                this.detector.startDetecting();
                var dataSourceId = this.dataset.source;
                if (dataSourceId) {
                    this.bindDataSource(dataSourceId);
                }
            },
            attachedCallback: function () {
                this.onResize = this.onResize.bind(this);
                window.addEventListener('resize', this.onResize, false);
                document.addEventListener('click', this.onDocumentEvent, true);
                document.addEventListener('focus', this.onDocumentEvent, true);
            },
            detachedCallback: function () {
                window.removeEventListener('resize', this.onResize, false);
                document.removeEventListener('click', this.onDocumentClick, true);
                document.addEventListener('focus', this.onDocumentEvent, true);
            },
            onFocus: function (event) {
                this.inputNode = event.target;
                if (this.inputLabelNode) {
                    this.inputLabelNode.classList.remove('cmp-autocomplete-active');
                }
                this.inputLabelNode = findAncestorWithClass(this.inputNode, 'cmp-autocomplete-input-label');
                this.inputLabelNode.classList.add('cmp-autocomplete-active');
                this.query = this.inputNode.value.trim();
                this.runThrottledQuery();
            },
            onDocumentEvent: function (event) {
                var target = event.target;
                if (!target.classList) {
                    this.hide();
                    return;
                }
                if (target.classList.contains('cmp-autocomplete-input')) {
                    return;
                }
                if (getAutocompleteItem(target)) {
                    return;
                }
                this.hide();
            },
            onInput: function (event) {
                this.query = this.inputNode.value.trim();
                this.runThrottledQuery();
            },
            onResize: function (event) {
                if (this.inputNode && !this.isHidden) {
                    this.positionElements();
                }
            },
            onMatchKeyDown: function (event) {
                if (event.key === 'Enter' && !this.isHidden) {
                    this.onMatchClick(event);
                }
            },
            onMatchClick: function (event) {
                var node = getAutocompleteItem(event.originalTarget);
                if (node && node.match) {
                    event.preventDefault();
                    this.dispatchEvent(new CustomEvent('autocompleteSelected', {
                        detail: {
                            match: node.match,
                            inputNode: this.inputNode
                        }
                    }));
                }
            },
            bindDataSource: function (dataSourceId) {
                require([dataSourceId], dataSource => {
                    this.dataSource = dataSource;
                    if (this.query) {
                        this.runThrottledQuery();
                    }
                });
            },
            runThrottledQuery: function () {
                if (!this.query || !this.dataSource) {
                    this.list.innerHTML = '';
                    this.positionAndHide();
                    return;
                }
                if (!this.timedQueryId) {
                    this.timedQueryId = setTimeout(this.runQuery, 350);
                }
            },
            verticalSpace: 0,
            getExistingEntries: function () {
                return [];
            },
            runQuery: function () {
                this.timedQueryId = 0;
                this.dataSource(this.query).then(result => {
                    if (result.query !== this.query) {
                        return;
                    }
                    var existingEntries = this.getExistingEntries();
                    var contacts = result.contacts;
                    this.list.innerHTML = '';
                    var queryRegExp = new RegExp(regExpEscape(this.query), 'i');
                    contacts.forEach(contact => {
                        var emails = contact.email;
                        if (!emails || !emails.length) {
                            return;
                        }
                        var name = contact.name;
                        if (Array.isArray(name)) {
                            name = name[0];
                        }
                        emails.forEach(email => {
                            var address = email.value;
                            var hasExisting = existingEntries.some(function (entry) {
                                return entry.address === address;
                            });
                            if (hasExisting) {
                                return;
                            }
                            var node = itemTemplate.cloneNode(true), detailsNode = node.querySelector('.cmp-autocomplete-item-details'), nameNode = node.querySelector('.cmp-autocomplete-name'), emailNode = node.querySelector('.cmp-autocomplete-email');
                            mozL10n.setAttributes(detailsNode, 'compose-autocomplete-match', {
                                name: name,
                                address: address
                            });
                            formatMatchString(queryRegExp, name || address, nameNode);
                            formatMatchString(queryRegExp, address || '', emailNode);
                            var match = {
                                name: name,
                                address: address
                            };
                            node.match = match;
                            this.list.appendChild(node);
                        });
                    });
                    if (this.list.children.length) {
                        this.show();
                    } else {
                        this.positionAndHide();
                    }
                });
            },
            positionElements: function () {
                var originTop = this.originNode.getBoundingClientRect().top;
                var inputRect = this.inputNode.getBoundingClientRect();
                var translateY = inputRect.top - originTop + this.lastTranslateY - this.verticalSpace;
                if (translateY !== this.lastTranslateY) {
                    this.lastTranslateY = translateY;
                    this.inputAreaTranslated = new Promise(resolve => {
                        this._inputAreaResolve = resolve;
                    });
                    this.inputArea.style.transform = 'translateY(-' + translateY + 'px)';
                }
                return this.inputAreaTranslated.then(() => {
                    this.listTop = inputRect.height + 2 * this.verticalSpace;
                    this.list.style.top = this.listTop + 'px';
                    this.list.style.height = window.innerHeight - this.listTop - originTop + 'px';
                    this.list.scrollTop = 0;
                });
            },
            _translateYTransitionEnd: function (event) {
                if (this._inputAreaResolve) {
                    this._inputAreaResolve();
                    this._inputAreaResolve = null;
                }
            },
            show: function () {
                this.originNode.scrollTop = 0;
                this.originNode.classList.add('cmp-autocomplete-noscroll');
                this.positionElements().then(() => {
                    this.list.classList.remove('collapsed');
                });
            },
            hide: function () {
                this.hideList();
                if (this.inputLabelNode) {
                    this.inputLabelNode.classList.remove('cmp-autocomplete-active');
                }
                this.inputArea.style.transform = 'translateY(0px)';
                this.lastTranslateY = 0;
                this.originNode.classList.remove('cmp-autocomplete-noscroll');
            },
            hideList: function () {
                this.list.classList.add('collapsed');
            },
            positionAndHide: function () {
                this.positionElements().then(() => {
                    this.hideList();
                });
            },
            get isHidden() {
                return this.list.classList.contains('collapsed');
            }
        }
    ];
});
define('template!cards/compose.html', [
    'template',
    'element!cards/cmp/autocomplete'
], function (template) {
    return {
        createdCallback: template.templateCreatedCallback,
        template: template.objToFn({
            'id': 'cards/compose.html',
            'deps': ['element!cards/cmp/autocomplete'],
            'text': '<section class="cmp-compose-header" role="region" data-statuscolor="default">\n  <header data-prop="headerNode">\n    <a role="button" data-event="click:onBack" href="#" class="cmp-back-btn"\n       data-l10n-id="back-button">\n      <span class="icon icon-back"></span>\n    </a>\n    <menu type="toolbar">\n      <a role="button" href="#" data-event="click:onAttachmentAdd"\n         class="cmp-attachment-btn" data-l10n-id="compose-attachment-button">\n        <span class="icon icon-attachment"></span>\n      </a>\n      <a role="button" data-prop="sendButton" data-event="click:onSend"\n         href="#" class="cmp-send-btn" data-l10n-id="compose-send-button">\n      <span class="icon icon-send"></span>\n      </a>\n    </menu>\n    <h1 class="cmp-compose-header-label"\n      data-l10n-id="compose-new-header"></h1>\n  </header>\n</section>\n<div data-prop="scrollContainer"\n     class="scrollregion-below-header cmp-autocomplete-origin">\n  <div data-prop="addrBar">\n    <div class="cmp-autocomplete-input-container">\n      <div class="cmp-autocomplete-input-list">\n        <div data-prop="firstEnvelopeLine"\n             data-event="click:onContainerClick"\n             class="cmp-envelope-line cmp-combo cmp-autocomplete-input-label"\n             role="group" data-l10n-id="to-group">\n          <span class="cmp-to-label cmp-addr-label"\n                data-l10n-id="compose-to" aria-hidden="true"></span>\n          <div class="cmp-to-container cmp-addr-container">\n            <div class="cmp-bubble-container">\n                <input data-prop="toNode"\n                      data-event="keydown:onAddressKeydown,input:onAddressInput"\n                      dir="auto"\n                      class="cmp-to-text cmp-addr-text" type="email" />\n            </div>\n          </div>\n          <div data-event="click:onContactAdd"\n               class="cmp-to-add cmp-contact-add"\n               role="button"\n               data-l10n-id="compose-contact-add-recipient"></div>\n        </div>\n        <!-- XXX: spec calls for showing cc/bcc merged until selected,\n             but there is also the case where replying itself might need\n             to expand, so we are deferring that feature -->\n        <div data-event="click:onContainerClick"\n             class="cmp-envelope-line cmp-combo cmp-autocomplete-input-label"\n             role="group" data-l10n-id="cc-group">\n          <span class="cmp-cc-label cmp-addr-label"\n                 data-l10n-id="compose-cc" aria-hidden="true"></span>\n          <div class="cmp-cc-container cmp-addr-container">\n            <div class="cmp-bubble-container">\n              <input data-prop="ccNode"\n                     data-event="keydown:onAddressKeydown,input:onAddressInput"\n                     dir="auto"\n                     class="cmp-cc-text cmp-addr-text" type="email" />\n            </div>\n          </div>\n          <div data-event="click:onContactAdd"\n               class="cmp-cc-add cmp-contact-add"\n               role="button"\n               data-l10n-id="compose-contact-add-recipient"></div>\n        </div>\n        <div data-event="click:onContainerClick"\n             class="cmp-envelope-line cmp-combo cmp-autocomplete-input-label"\n             role="group" data-l10n-id="bcc-group">\n          <span class="cmp-bcc-label cmp-addr-label"\n                 data-l10n-id="compose-bcc" aria-hidden="true"></span>\n          <div class="cmp-bcc-container cmp-addr-container">\n            <div class="cmp-bubble-container">\n              <input data-prop="bccNode"\n                     data-event="keydown:onAddressKeydown,input:onAddressInput"\n                     dir="auto"\n                     class="cmp-bcc-text cmp-addr-text" type="email" />\n            </div>\n          </div>\n          <div data-event="click:onContactAdd"\n               class="cmp-bcc-add cmp-contact-add"\n               role="button"\n               data-l10n-id="compose-contact-add-recipient"></div>\n        </div>\n      </div>\n    </div>\n    <div class="cmp-envelope-line cmp-subject">\n      <span class="cmp-subject-label"\n            data-l10n-id="compose-subject" aria-hidden="true"></span>\n      <input data-prop="subjectNode"\n             dir="auto"\n             class="cmp-subject-text" type="text" data-l10n-id="subject" />\n    </div>\n    <div data-prop="errorMessage" class="cmp-error-message collapsed"></div>\n    <div data-prop="attachmentTotal"\n         class="cmp-envelope-line cmp-attachment-total collapsed"\n         aria-hidden="true">\n      <span data-prop="attachmentLabel"\n            class="cmp-attachment-label cmp-addr-label"\n            data-l10n-id="compose-attachments[zero]"></span>\n      <span data-prop="attachmentsSize" class="cmp-attachment-size"></span>\n    </div>\n    <ul data-prop="attachmentsContainer" class="cmp-attachment-container">\n    </ul>\n  </div>\n  <div data-prop="textBodyNode" class="cmp-body-text" contenteditable="true" role="textbox" aria-multiline="true"\n       data-l10n-id="compose-text"></div>\n  <div data-prop="htmlBodyContainer"\n       data-event="click:_focusEditorWithCursorAtEnd"\n       dir="auto"\n       class="cmp-body-html"\n       data-l10n-id="message-body-container">\n  </div>\n  <!-- Autocomplete at the bottom since it should have the highest z order\n       placement, so that the autocomplete matches are visible. -->\n  <cmp-autocomplete data-prop="autocomplete"\n                    data-event="autocompleteSelected"\n                    data-source="cards/cmp/autocomplete_source">\n  </cmp-autocomplete>\n</div>\n'
        })
    };
});
define('cards/compose', [
    'require',
    'exports',
    'module',
    'tmpl!./cmp/attachment_item.html',
    'tmpl!./cmp/contact_menu.html',
    'tmpl!./cmp/draft_menu.html',
    'tmpl!./cmp/peep_bubble.html',
    'tmpl!./cmp/invalid_addresses.html',
    'tmpl!./msg/attach_confirm.html',
    'evt',
    'html_cache',
    'toaster',
    'iframe_shims',
    'marquee',
    'l10n!',
    'cards',
    'confirm_dialog',
    'mime_to_class',
    'file_display',
    './base_card',
    'template!./compose.html',
    './editor_mixins'
], function (require, exports, module) {
    var cmpAttachmentItemNode = require('tmpl!./cmp/attachment_item.html'), cmpContactMenuNode = require('tmpl!./cmp/contact_menu.html'), cmpDraftMenuNode = require('tmpl!./cmp/draft_menu.html'), cmpPeepBubbleNode = require('tmpl!./cmp/peep_bubble.html'), cmpInvalidAddressesNode = require('tmpl!./cmp/invalid_addresses.html'), msgAttachConfirmNode = require('tmpl!./msg/attach_confirm.html'), evt = require('evt'), htmlCache = require('html_cache'), toaster = require('toaster'), iframeShims = require('iframe_shims'), Marquee = require('marquee'), mozL10n = require('l10n!'), cards = require('cards'), ConfirmDialog = require('confirm_dialog'), mimeToClass = require('mime_to_class'), fileDisplay = require('file_display'), addrPropNames = [
            'to',
            'cc',
            'bcc'
        ], dataIdCounter = 0;
    var MAX_ATTACHMENT_SIZE = 22 * 1024 * 1024;
    function focusInputAndPositionCursorFromContainerClick(event, input) {
        if (event.explicitOriginalTarget === input) {
            return;
        }
        event.stopPropagation();
        var bounds = input.getBoundingClientRect();
        var midX = bounds.left + bounds.width / 2;
        input.focus();
        var cursorPos = 0;
        if (event.clientX >= midX) {
            cursorPos = input.value.length;
        }
        input.setSelectionRange(cursorPos, cursorPos);
    }
    return [
        require('./base_card')(require('template!./compose.html')),
        require('./editor_mixins'),
        {
            createdCallback: function () {
                htmlCache.cloneAndSave(module.id, this);
                this.sending = false;
                this._totalAttachmentsFinishing = 0;
                this._totalAttachmentsDone = 0;
                this._wantAttachment = false;
                this._onAttachmentDone = this._onAttachmentDone.bind(this);
                this._bindEditor(this.textBodyNode);
                var subjectContainer = this.querySelector('.cmp-subject');
                subjectContainer.addEventListener('click', function subjectFocus(evt) {
                    focusInputAndPositionCursorFromContainerClick(evt, subjectContainer.querySelector('input'));
                });
                this.scrollContainer.addEventListener('click', function (event) {
                    var bounds = this.textBodyNode.getBoundingClientRect();
                    if (event.clientY > bounds.bottom) {
                        this._focusEditorWithCursorAtEnd(event);
                    }
                }.bind(this));
                this._selfClosed = false;
                var dataId = module.id + '-' + (dataIdCounter += 1);
                this._dataIdSaveDraft = dataId + '-saveDraft';
                this._dataIdSendEmail = dataId + '-sendEmail';
                this.autocomplete.getExistingEntries = this.getExistingEntriesForAutocomplete.bind(this);
            },
            onArgs: function (args) {
                this.composer = args.composer;
                this.composerData = args.composerData || {};
                this.activity = args.activity;
                this.model = args.model;
            },
            onCardVisible: function () {
                var props = getComputedStyle(this.firstEnvelopeLine), space = parseInt(props['padding-top'], 10) + parseInt(props['margin-top'], 10);
                this.autocomplete.verticalSpace = space;
            },
            skipEmitContentEvents: true,
            _focusEditorWithCursorAtEnd: function (event) {
                if (event) {
                    event.stopPropagation();
                }
                var insertAfter = this.textBodyNode.lastChild;
                var range = document.createRange();
                range.setStartAfter(insertAfter);
                range.setEndAfter(insertAfter);
                this.textBodyNode.focus();
                var selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            },
            postInsert: function () {
                require(['iframe_shims'], function () {
                    if (this.composer) {
                        this._loadStateFromComposer();
                    } else {
                        var data = this.composerData, model = this.model;
                        model.latestOnce('folder', function (folder) {
                            this.composer = model.api.beginMessageComposition(data.message, folder, data.options, function () {
                                if (data.onComposer) {
                                    data.onComposer(this.composer, this);
                                }
                                this._loadStateFromComposer();
                            }.bind(this));
                        }.bind(this));
                    }
                }.bind(this));
            },
            _loadStateFromComposer: function () {
                var self = this;
                function expandAddresses(node, addresses) {
                    if (!addresses) {
                        return '';
                    }
                    addresses.forEach(function (aval) {
                        var name, address;
                        if (typeof aval === 'string') {
                            name = address = aval;
                        } else {
                            name = aval.name;
                            address = aval.address;
                        }
                        self.insertBubble(node, name, address);
                    });
                }
                expandAddresses(this.toNode, this.composer.to);
                expandAddresses(this.ccNode, this.composer.cc);
                expandAddresses(this.bccNode, this.composer.bcc);
                this.validateAddresses();
                this.renderSendStatus();
                this.renderAttachments();
                this.subjectNode.value = this.composer.subject;
                this.origText = this.composer.body.text;
                this.populateEditor(this.composer.body.text);
                if (this.composer.body.html) {
                    var ishims = iframeShims.createAndInsertIframeForContent(this.composer.body.html, this.scrollContainer, this.htmlBodyContainer, null, 'noninteractive', null);
                    this.htmlIframeNode = ishims.iframe;
                }
                if (!this._emittedContentEvents) {
                    evt.emit('metrics:contentDone');
                    this._emittedContentEvents = true;
                }
            },
            renderSendStatus: function () {
                var sendStatus = this.composer.sendStatus || {};
                if (sendStatus.state === 'error') {
                    var badAddresses = sendStatus.badAddresses || [];
                    console.log('Editing a failed outbox message. Details:', JSON.stringify({
                        err: sendStatus.err,
                        badAddressCount: badAddresses.length,
                        sendFailures: sendStatus.sendFailures
                    }, null, ' '));
                    var l10nId;
                    if (badAddresses.length || sendStatus.err === 'bad-recipient') {
                        l10nId = 'send-failure-recipients';
                    } else {
                        l10nId = 'send-failure-unknown';
                    }
                    this.errorMessage.setAttribute('data-l10n-id', l10nId);
                    this.errorMessage.classList.remove('collapsed');
                } else {
                    this.errorMessage.classList.add('collapsed');
                }
            },
            isValidAddress: function (address) {
                var mailbox = this.model.api.parseMailbox(address);
                return mailbox && mailbox.address;
            },
            extractAddresses: function () {
                var allAddresses = [];
                var invalidAddresses = [];
                var frobAddressNode = function (node) {
                    var bubbles = node.parentNode.querySelectorAll('.cmp-peep-bubble');
                    var addrList = [];
                    for (var i = 0; i < bubbles.length; i++) {
                        var dataSet = bubbles[i].dataset;
                        addrList.push({
                            name: dataSet.name,
                            address: dataSet.address
                        });
                    }
                    if (node.value.trim().length !== 0) {
                        var mailbox = this.model.api.parseMailbox(node.value);
                        addrList.push({
                            name: mailbox.name,
                            address: mailbox.address
                        });
                    }
                    addrList.forEach(function (addr) {
                        allAddresses.push(addr);
                        if (!this.isValidAddress(addr.address)) {
                            invalidAddresses.push(addr);
                        }
                    }.bind(this));
                    return addrList;
                }.bind(this);
                return {
                    to: frobAddressNode(this.toNode),
                    cc: frobAddressNode(this.ccNode),
                    bcc: frobAddressNode(this.bccNode),
                    all: allAddresses,
                    invalid: invalidAddresses
                };
            },
            haveAddressesChanged: function () {
                var addrs = this.extractAddresses();
                function addressesDiffer(a, b) {
                    return a.length !== b.length || a.some(function (e, i) {
                        return e !== b[i].address;
                    });
                }
                return addressesDiffer(this.composer.to, addrs.to) || addressesDiffer(this.composer.cc, addrs.cc) || addressesDiffer(this.composer.bcc, addrs.bcc);
            },
            _saveStateToComposer: function () {
                var addrs = this.extractAddresses();
                this.composer.to = addrs.to;
                this.composer.cc = addrs.cc;
                this.composer.bcc = addrs.bcc;
                this.composer.subject = this.subjectNode.value;
                this.composer.body.text = this.fromEditor();
            },
            _closeCard: function () {
                this._selfClosed = true;
                cards.removeCardAndSuccessors(this, 'animate');
            },
            _saveNeeded: function () {
                if (!this.composer) {
                    return false;
                }
                var hasNewContent = this.fromEditor() !== this.composer.body.text;
                return this.subjectNode.value || hasNewContent || this.haveAddressesChanged() || this.composer.attachments.length || this.composer.hasDraft;
            },
            _saveDraft: function (reason, callback) {
                if (this.sending && reason === 'automatic') {
                    console.log('compose: skipping autosave because send in progress');
                    return;
                }
                this._saveStateToComposer();
                evt.emit('uiDataOperationStart', this._dataIdSaveDraft);
                this.composer.saveDraft(function () {
                    evt.emit('uiDataOperationStop', this._dataIdSaveDraft);
                    if (callback) {
                        callback();
                    }
                }.bind(this));
            },
            createBubbleNode: function (name, address) {
                var bubble = cmpPeepBubbleNode.cloneNode(true);
                bubble.classList.add('peep-bubble');
                bubble.classList.add('msg-peep-bubble');
                bubble.setAttribute('data-address', address);
                bubble.querySelector('.cmp-peep-address').textContent = address;
                var nameNode = bubble.querySelector('.cmp-peep-name');
                if (!name) {
                    nameNode.textContent = address.indexOf('@') !== -1 ? address.split('@')[0] : address;
                } else {
                    nameNode.textContent = name;
                    bubble.setAttribute('data-name', name);
                }
                bubble.dataset.address = bubble.dataset.address || bubble.dataset.name;
                return bubble;
            },
            getExistingEntriesForAutocomplete: function () {
                var addrs = this.extractAddresses(), all = [];
                addrPropNames.forEach(function (prop) {
                    var ary = addrs[prop];
                    if (ary.length) {
                        all = all.concat(ary);
                    }
                });
                return all;
            },
            autocompleteSelected: function (event) {
                var match = event.detail.match, inputNode = event.detail.inputNode;
                this.addFromEntry(match, inputNode);
            },
            addFromEntry: function (match, inputNode) {
                inputNode.style.width = '0.5rem';
                this.insertBubble(inputNode, match.name, match.address);
                inputNode.value = '';
                inputNode.focus();
            },
            insertBubble: function (node, name, address) {
                var container = node.parentNode;
                var bubble = this.createBubbleNode(name || address, address);
                container.insertBefore(bubble, node);
                this.validateAddresses();
            },
            deleteBubble: function (node) {
                if (!node) {
                    return;
                }
                var container = node.parentNode;
                if (node.classList.contains('cmp-peep-bubble')) {
                    container.removeChild(node);
                }
                this.validateAddresses();
            },
            editBubble: function (node) {
                if (!node) {
                    return;
                }
                var container = node.parentNode;
                if (node.classList.contains('cmp-peep-bubble')) {
                    container.removeChild(node);
                    var input = container.querySelector('.cmp-addr-text');
                    if (input.value.length > 0) {
                        input.value = input.value + ',';
                        this.onAddressInput({ target: input });
                    }
                    var address = node.dataset.address;
                    var selStart = input.value.length;
                    var selEnd = selStart + address.length;
                    input.value += address;
                    input.focus();
                    this.onAddressInput({ target: input });
                    input.setSelectionRange(selStart, selEnd);
                }
                this.validateAddresses();
            },
            onAddressKeydown: function (evt) {
                var node = evt.target;
                if (evt.keyCode === 8 && node.value === '') {
                    var previousBubble = node.previousElementSibling;
                    this.deleteBubble(previousBubble);
                    this.autocomplete.onInput();
                }
            },
            onAddressInput: function (evt) {
                var node = evt.target;
                var entryMatch;
                var makeBubble = false;
                switch (node.value.slice(-1)) {
                case ' ':
                    makeBubble = node.value.indexOf('@') !== -1;
                    break;
                case ',':
                case ';':
                    makeBubble = true;
                    break;
                }
                if (makeBubble) {
                    entryMatch = this.model.api.parseMailbox(node.value);
                    this.addFromEntry(entryMatch, node);
                }
                if (!this.stringContainer) {
                    this.stringContainer = document.createElement('div');
                    this.appendChild(this.stringContainer);
                    var inputStyle = window.getComputedStyle(node);
                    this.stringContainer.style.fontSize = inputStyle.fontSize;
                }
                this.stringContainer.style.display = 'inline-block';
                this.stringContainer.textContent = node.value;
                node.style.width = this.stringContainer.clientWidth + 2 + 'px';
                this.validateAddresses();
            },
            onContainerClick: function (evt) {
                var target = evt.target;
                if (target.classList.contains('cmp-peep-bubble')) {
                    var contents = cmpContactMenuNode.cloneNode(true);
                    var email = target.querySelector('.cmp-peep-address').textContent;
                    var headerNode = contents.getElementsByTagName('header')[0];
                    Marquee.setup(email, headerNode);
                    cards.setStatusColor(contents);
                    document.body.appendChild(contents);
                    Marquee.activate('alternate', 'ease');
                    var formSubmit = function (evt) {
                        cards.setStatusColor();
                        document.body.removeChild(contents);
                        switch (evt.explicitOriginalTarget.className) {
                        case 'cmp-contact-menu-edit':
                            this.editBubble(target);
                            break;
                        case 'cmp-contact-menu-delete':
                            this.deleteBubble(target);
                            break;
                        case 'cmp-contact-menu-cancel':
                            break;
                        }
                        return false;
                    }.bind(this);
                    contents.addEventListener('submit', formSubmit);
                    return;
                }
                var input = evt.currentTarget.getElementsByClassName('cmp-addr-text')[0];
                focusInputAndPositionCursorFromContainerClick(evt, input);
            },
            _warnAttachmentSizeExceeded: function (numAttachments) {
                var dialog = msgAttachConfirmNode.cloneNode(true);
                var title = dialog.getElementsByTagName('h1')[0];
                var content = dialog.getElementsByTagName('p')[0];
                if (numAttachments > 1) {
                    mozL10n.setAttributes(title, 'composer-attachments-large');
                    mozL10n.setAttributes(content, 'compose-attchments-size-exceeded');
                } else {
                    mozL10n.setAttributes(title, 'composer-attachment-large');
                    mozL10n.setAttributes(content, 'compose-attchment-size-exceeded');
                }
                ConfirmDialog.show(dialog, {
                    id: 'msg-attach-ok',
                    handler: function () {
                    }.bind(this)
                });
            },
            _onAttachmentDone: function () {
                this._totalAttachmentsDone += 1;
                if (this._totalAttachmentsDone < this._totalAttachmentsFinishing) {
                    return;
                }
                setTimeout(function () {
                    var wantAttachment = this._wantAttachment;
                    this._totalAttachmentsFinishing = 0;
                    this._totalAttachmentsDone = 0;
                    this._wantAttachment = false;
                    if (toaster.isShowing()) {
                        toaster.hide();
                    }
                    if (wantAttachment) {
                        this.onAttachmentAdd();
                    }
                }.bind(this), 600);
            },
            addAttachmentsSubjectToSizeLimits: function (toAttach) {
                var totalSize = this.calculateTotalAttachmentsSize();
                var attachedAny = false;
                while (toAttach.length) {
                    var attachment = toAttach.shift();
                    totalSize += attachment.blob.size;
                    if (totalSize >= MAX_ATTACHMENT_SIZE) {
                        this._warnAttachmentSizeExceeded(1 + toAttach.length);
                        break;
                    }
                    this._totalAttachmentsFinishing += 1;
                    this.composer.addAttachment(attachment, this._onAttachmentDone);
                    attachedAny = true;
                }
                if (attachedAny) {
                    this.renderAttachments();
                }
            },
            renderAttachments: function () {
                if (this.composer.attachments && this.composer.attachments.length) {
                    this.attachmentsContainer.innerHTML = '';
                    var attTemplate = cmpAttachmentItemNode, filenameTemplate = attTemplate.getElementsByClassName('cmp-attachment-filename')[0], filesizeTemplate = attTemplate.getElementsByClassName('cmp-attachment-filesize')[0];
                    for (var i = 0; i < this.composer.attachments.length; i++) {
                        var attachment = this.composer.attachments[i];
                        filenameTemplate.textContent = attachment.name;
                        fileDisplay.fileSize(filesizeTemplate, attachment.blob.size);
                        var attachmentNode = attTemplate.cloneNode(true);
                        this.attachmentsContainer.appendChild(attachmentNode);
                        attachmentNode.classList.add(mimeToClass(attachment.blob.type));
                        attachmentNode.getElementsByClassName('cmp-attachment-remove')[0].addEventListener('click', this.onClickRemoveAttachment.bind(this, attachmentNode, attachment));
                    }
                    this.updateAttachmentsSize();
                    this.attachmentsContainer.classList.remove('collapsed');
                } else {
                    this.attachmentsContainer.classList.add('collapsed');
                }
                this.updateAttachmentsAriaLabel();
            },
            updateAttachmentsAriaLabel: function () {
                var kilobytes = this.composer.attachments.length > 1 ? Math.ceil(this.calculateTotalAttachmentsSize() / 1024) : 0;
                mozL10n.setAttributes(this.attachmentsContainer, 'compose-attachments-container', { kilobytes: kilobytes });
            },
            calculateTotalAttachmentsSize: function () {
                var totalSize = 0;
                for (var i = 0; i < this.composer.attachments.length; i++) {
                    totalSize += this.composer.attachments[i].blob.size;
                }
                return totalSize;
            },
            updateAttachmentsSize: function () {
                mozL10n.setAttributes(this.attachmentLabel, 'compose-attachments', { n: this.composer.attachments.length });
                if (this.composer.attachments.length === 0) {
                    this.attachmentsSize.textContent = '';
                    this.attachmentsContainer.classList.add('collapsed');
                } else {
                    fileDisplay.fileSize(this.attachmentsSize, this.calculateTotalAttachmentsSize());
                }
                if (this.composer.attachments.length > 1) {
                    this.attachmentTotal.classList.remove('collapsed');
                } else {
                    this.attachmentTotal.classList.add('collapsed');
                }
            },
            onClickRemoveAttachment: function (node, attachment) {
                node.parentNode.removeChild(node);
                this.composer.removeAttachment(attachment);
                this.updateAttachmentsAriaLabel();
                this.updateAttachmentsSize();
            },
            onBack: function () {
                var goBack = function () {
                    if (this.activity) {
                        this.activity.postError('cancelled');
                        this.activity = null;
                    }
                    this._closeCard();
                }.bind(this);
                if (!this._saveNeeded()) {
                    console.log('compose: back: no save needed, exiting without prompt');
                    goBack();
                    return;
                }
                console.log('compose: back: save needed, prompting');
                var menu = cmpDraftMenuNode.cloneNode(true);
                this._savePromptMenu = menu;
                cards.setStatusColor(menu);
                document.body.appendChild(menu);
                var formSubmit = function (evt) {
                    cards.setStatusColor();
                    document.body.removeChild(menu);
                    this._savePromptMenu = null;
                    switch (evt.explicitOriginalTarget.id) {
                    case 'cmp-draft-save':
                        console.log('compose: explicit draft save on exit');
                        this._saveDraft('explicit');
                        goBack();
                        break;
                    case 'cmp-draft-discard':
                        console.log('compose: explicit draft discard on exit');
                        this.composer.abortCompositionDeleteDraft();
                        goBack();
                        break;
                    case 'cmp-draft-cancel':
                        console.log('compose: canceled compose exit');
                        break;
                    }
                    return false;
                }.bind(this);
                menu.addEventListener('submit', formSubmit);
            },
            onCurrentCardDocumentVisibilityChange: function () {
                if (document.hidden && this._saveNeeded()) {
                    console.log('compose: autosaving; we became hidden and save needed.');
                    this._saveDraft('automatic');
                }
            },
            validateAddresses: function () {
                var addrs = this.extractAddresses();
                if (addrs.all.length === 0) {
                    this.sendButton.setAttribute('aria-disabled', 'true');
                } else {
                    this.sendButton.setAttribute('aria-disabled', 'false');
                }
                if (addrs.invalid.length === 0) {
                    this.errorMessage.classList.add('collapsed');
                    return true;
                } else {
                    return false;
                }
            },
            onSend: function () {
                if (!this.validateAddresses()) {
                    ConfirmDialog.show(cmpInvalidAddressesNode.cloneNode(true), {
                        id: 'cmp-confirm-invalid-addresses',
                        handler: function () {
                        }
                    });
                } else {
                    this.reallySend();
                }
            },
            reallySend: function () {
                this._saveStateToComposer();
                var activity = this.activity;
                this.sending = true;
                console.log('compose: initiating send');
                evt.emit('uiDataOperationStart', this._dataIdSendEmail);
                this.composer.finishCompositionSendMessage(function (sendInfo) {
                    evt.emit('uiDataOperationStop', this._dataIdSendEmail);
                    if (!this.composer) {
                        return;
                    }
                    if (activity) {
                        activity.postResult('complete');
                        activity = null;
                    }
                    this._closeCard();
                }.bind(this));
            },
            onContactAdd: function (event) {
                event.stopPropagation();
                var contactBtn = event.target;
                var self = this;
                contactBtn.classList.remove('show');
                try {
                    var activity = new MozActivity({
                        name: 'pick',
                        data: { type: 'webcontacts/email' }
                    });
                    activity.onsuccess = function success() {
                        if (this.result.email) {
                            var emt = contactBtn.parentElement.querySelector('.cmp-addr-text');
                            var name = this.result.name;
                            if (Array.isArray(name)) {
                                name = name[0];
                            }
                            self.insertBubble(emt, name, this.result.email);
                        }
                    };
                } catch (e) {
                    console.log('WebActivities unavailable? : ' + e);
                }
            },
            onAttachmentAdd: function (event) {
                if (event) {
                    event.stopPropagation();
                }
                if (this._totalAttachmentsFinishing > 0) {
                    this._wantAttachment = true;
                    toaster.toast({ text: mozL10n.get('compose-attachment-still-working') });
                    return;
                }
                try {
                    console.log('compose: attach: triggering web activity');
                    var activity = new MozActivity({
                        name: 'pick',
                        data: {
                            type: [
                                'image/*',
                                'video/*',
                                'audio/*',
                                'application/*',
                                'text/vcard'
                            ],
                            nocrop: true
                        }
                    });
                    activity.onsuccess = function success() {
                        require(['attachment_name'], function (attachmentName) {
                            var blob = activity.result.blob, name = activity.result.blob.name || activity.result.name, count = this.composer.attachments.length + 1;
                            name = attachmentName.ensureName(blob, name, count);
                            console.log('compose: attach activity success:', name);
                            name = name.substring(name.lastIndexOf('/') + 1);
                            this.addAttachmentsSubjectToSizeLimits([{
                                    name: name,
                                    blob: activity.result.blob
                                }]);
                        }.bind(this));
                    }.bind(this);
                } catch (e) {
                    console.log('WebActivities unavailable? : ' + e);
                }
            },
            die: function () {
                if (this._savePromptMenu) {
                    document.body.removeChild(this._savePromptMenu);
                    this._savePromptMenu = null;
                }
                if (!this._selfClosed && this._saveNeeded()) {
                    console.log('compose: autosaving draft because not self-closed');
                    this._saveDraft('automatic');
                }
                if (this.composer) {
                    this.composer.die();
                    this.composer = null;
                }
            }
        }
    ];
});