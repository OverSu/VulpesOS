define('tmpl!cards/msg/contact_menu.html', ['tmpl'], function (tmpl) {
    return tmpl.toDom('<form class="msg-contact-menu" role="dialog" data-type="action">\n\xA0 \xA0<header></header>\n\xA0 \xA0<menu>\n    <button class="msg-contact-menu-new collapsed" data-l10n-id="message-contact-menu-new">\n    </button>\n    <button class="msg-contact-menu-reply collapsed" data-l10n-id="message-contact-menu-reply">\n    </button>\n    <button class="msg-contact-menu-view collapsed" data-l10n-id="message-contact-menu-view">\n    </button>\n    <button class="msg-contact-menu-create-contact collapsed" data-l10n-id="message-contact-menu-create">\n    </button>\n    <button class="msg-contact-menu-add-to-existing-contact collapsed" data-l10n-id="message-contact-menu-add-existing">\n    </button>\n    <span class="last-button-container">\n      <button class="msg-contact-menu-cancel" data-l10n-id="message-multiedit-cancel">\n      </button>\n    </span>\n\xA0 \xA0</menu>\n\xA0</form>\n');
});
define('tmpl!cards/msg/reply_menu.html', ['tmpl'], function (tmpl) {
    return tmpl.toDom('<form class="msg-reply-menu" role="dialog" data-type="action">\n  <header></header>\n  <menu>\n    <button class="msg-reply-menu-reply" data-l10n-id="message-reply-menu-reply">\n    </button>\n    <button class="msg-reply-menu-reply-all" data-l10n-id="message-reply-menu-reply-all">\n    </button>\n    <button class="msg-reply-menu-forward" data-l10n-id="message-reply-menu-forward">\n    </button>\n    <span class="last-button-container">\n      <button class="msg-reply-menu-cancel" data-l10n-id="message-reply-menu-cancel">\n      </button>\n    </span>\n  </menu>\n</form>\n');
});
define('tmpl!cards/msg/browse_confirm.html', ['tmpl'], function (tmpl) {
    return tmpl.toDom('<form role="dialog" class="msg-browse-confirm" data-type="confirm">\n  <section>\n    <h1 data-l10n-id="confirm-dialog-title"></h1>\n    <p></p>\n  </section>\n  <menu>\n    <button id="msg-browse-cancel" data-l10n-id="message-multiedit-cancel"></button>\n    <button id="msg-browse-ok" class="recommend" data-l10n-id="dialog-button-ok"></button>\n  </menu>\n</form>');
});
define('tmpl!cards/msg/peep_bubble.html', ['tmpl'], function (tmpl) {
    return tmpl.toDom('<div class="msg-peep-bubble peep-bubble" dir="auto" role="option">\n  <span class="msg-peep-content"></span>\n</div>\n');
});
define('tmpl!cards/msg/attachment_item.html', ['tmpl'], function (tmpl) {
    return tmpl.toDom('<li class="msg-attachment-item">\n  <span class="msg-attachment-icon" role="presentation"></span>\n  <span class="msg-attachment-fileinfo">\n    <span dir="auto" class="msg-attachment-filename"></span>\n    <span class="msg-attachment-filesize"></span>\n    <span data-l10n-id="message-attachment-too-large"\n          class="msg-attachment-too-large"></span>\n  </span>\n  <button class="msg-attachment-download" data-l10n-id="download-button">\n    <span class="icon icon-download"></span></button>\n  <span class="msg-attachment-downloading">\n    <progress class="small" data-l10n-id="downloading-progress"></progress>\n  </span>\n  <button class="msg-attachment-view" data-l10n-id="view-button">\n    <span data-l10n-id="message-attachment-view" class="icon icon-view"></span>\n  </button>\n</li>\n');
});
define('tmpl!cards/msg/attachment_disabled_confirm.html', ['tmpl'], function (tmpl) {
    return tmpl.toDom('<form role="dialog" class="msg-attachment-disabled-confirm" data-type="confirm">\n  <section>\n    <p data-l10n-id="message-send-attachment-disabled-confirm"></p>\n  </section>\n  <menu>\n    <button id="msg-attachment-disabled-cancel" data-l10n-id="message-multiedit-cancel"></button>\n    <button id="msg-attachment-disabled-ok" data-l10n-id="dialog-button-ok"></button>\n  </menu>\n</form>\n');
});
define('tmpl!cards/msg/attachment_did_not_open_alert.html', ['tmpl'], function (tmpl) {
    return tmpl.toDom('<form role="dialog" class="msg-attachment-did-not-open" data-type="confirm">\n  <section>\n    <h1 data-l10n-id="message-attachment-did-not-open-label"></h1>\n    <p><span data-l10n-id="message-attachment-did-not-open-body"></span></p>\n  </section>\n  <menu>\n    <button id="msg-attachment-did-not-open-ok" data-l10n-id="dialog-button-ok"></button>\n  </menu>\n</form>\n');
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
define('template!cards/message_reader.html', ['template'], function (template) {
    return {
        createdCallback: template.templateCreatedCallback,
        template: template.objToFn({
            'id': 'cards/message_reader.html',
            'deps': [],
            'text': '<section class="msg-reader-header" role="region" data-statuscolor="default">\n  <header>\n    <a data-event="click:onBack" href="#" class="msg-back-btn"\n       role="button" data-l10n-id="back-button">\n      <span class="icon icon-back"></span>\n    </a>\n    <menu type="toolbar">\n      <button data-prop="previousBtn" class="msg-up-btn"\n              data-l10n-id="message-reader-next-button">\n        <span data-prop="previousIcon" class="icon icon-up"></span>\n      </button>\n      <button data-prop="nextBtn" class="msg-down-btn"\n              data-l10n-id="message-reader-previous-button">\n        <span data-prop="nextIcon" class="icon icon-down"></span>\n      </button>\n    </menu>\n    <h1 dir="auto" class="msg-reader-header-label"></h1>\n  </header>\n</section>\n<div data-prop="scrollContainer"\n     class="scrollregion-below-header scrollregion-horizontal-too">\n  <div data-prop="envelopeBar" class="msg-envelope-bar">\n    <div class="msg-envelope-line msg-envelope-from-line"\n         role="listbox" data-l10n-id="from-group">\n      <span class="msg-envelope-key"\n             data-l10n-id="envelope-from" aria-hidden="true"></span>\n    </div>\n    <!-- the details starts out collapsed, but can be toggled -->\n    <div class="msg-envelope-details">\n      <div class="msg-envelope-line msg-envelope-to-line"\n           role="listbox" data-l10n-id="to-group">\n        <span class="msg-envelope-key"\n               data-l10n-id="envelope-to" aria-hidden="true"></span>\n      </div>\n      <div class="msg-envelope-line msg-envelope-cc-line"\n           role="listbox" data-l10n-id="cc-group">\n        <span class="msg-envelope-key"\n               data-l10n-id="envelope-cc" aria-hidden="true"></span>\n      </div>\n      <div class="msg-envelope-line msg-envelope-bcc-line"\n           role="listbox" data-l10n-id="bcc-group">\n        <span class="msg-envelope-key"\n               data-l10n-id="envelope-bcc" aria-hidden="true"></span>\n      </div>\n    </div>\n    <div class="msg-envelope-subject-container">\n      <h3 aria-level="2" class="msg-envelope-subject"\n          data-l10n-id="subject" dir="auto"></h3>\n      <span role="heading" aria-level="3" class="msg-envelope-date"\n            data-l10n-id="message-reader-date-received"></span>\n    </div>\n  </div>\n  <ul data-prop="attachmentsContainer"\n      class="msg-attachments-container collapsed"\n      data-l10n-id="attachments-container">\n  </ul>\n  <!-- Tells us about remote/not downloaded images, asks to show -->\n  <div data-prop="loadBar" class="msg-reader-load-infobar collapsed"\n       role="button">\n    <p data-prop="loadBarText" class="msg-reader-load-infobar-text"></p>\n    <button class="msg-reader-load-infobar-button"\n            aria-hidden="true"></button>\n  </div>\n  <div data-prop="rootBodyNode"\n       class="msg-body-container"\n       data-l10n-id="message-body-container">\n    <progress data-l10n-id="message-body-container-progress"></progress>\n  </div>\n</div>\n\n<ul class="bb-tablist msg-reader-action-toolbar" role="toolbar">\n  <li role="presentation">\n    <button data-prop="deleteBtn" class="icon msg-delete-btn"\n            data-l10n-id="message-delete-button"></button>\n  </li>\n  <li role="presentation">\n    <button data-prop="starBtn" class="icon msg-star-btn"\n            data-l10n-id="message-star-button"></button>\n  </li>\n  <li role="presentation">\n    <button data-prop="readBtn" class="icon msg-mark-read-btn"\n            data-l10n-id="message-mark-read-button"></button>\n  </li>\n  <li role="presentation">\n    <button data-prop="moveBtn" class="icon msg-move-btn"\n            data-l10n-id="message-move-button"></button>\n  </li>\n  <li role="presentation">\n    <button data-prop="replyBtn" class="icon msg-reply-btn"\n            data-l10n-id="message-reply-forward-button"></button>\n  </li>\n</ul>\n'
        })
    };
});
define('cards/message_reader', [
    'require',
    'tmpl!./msg/delete_confirm.html',
    'tmpl!./msg/contact_menu.html',
    'tmpl!./msg/reply_menu.html',
    'tmpl!./msg/browse_confirm.html',
    'tmpl!./msg/peep_bubble.html',
    'tmpl!./msg/attachment_item.html',
    'tmpl!./msg/attachment_disabled_confirm.html',
    'tmpl!./msg/attachment_did_not_open_alert.html',
    'cards',
    'confirm_dialog',
    'date',
    'toaster',
    'header_cursor',
    'evt',
    'iframe_shims',
    'marquee',
    'l10n!',
    'query_uri',
    'mime_to_class',
    'file_display',
    'message_display',
    './base_card',
    'template!./message_reader.html'
], function (require) {
    var MimeMapper, msgDeleteConfirmNode = require('tmpl!./msg/delete_confirm.html'), msgContactMenuNode = require('tmpl!./msg/contact_menu.html'), msgReplyMenuNode = require('tmpl!./msg/reply_menu.html'), msgBrowseConfirmNode = require('tmpl!./msg/browse_confirm.html'), msgPeepBubbleNode = require('tmpl!./msg/peep_bubble.html'), msgAttachmentItemNode = require('tmpl!./msg/attachment_item.html'), msgAttachmentDisabledConfirmNode = require('tmpl!./msg/attachment_disabled_confirm.html'), msgAttachmentDidNotOpenAlertNode = require('tmpl!./msg/attachment_did_not_open_alert.html'), cards = require('cards'), ConfirmDialog = require('confirm_dialog'), date = require('date'), toaster = require('toaster'), HeaderCursor = require('header_cursor'), evt = require('evt'), iframeShims = require('iframe_shims'), Marquee = require('marquee'), mozL10n = require('l10n!'), queryURI = require('query_uri'), mimeToClass = require('mime_to_class'), fileDisplay = require('file_display'), messageDisplay = require('message_display');
    var CONTENT_TYPES_TO_CLASS_NAMES = [
        null,
        'msg-body-content',
        'msg-body-signature',
        'msg-body-leadin',
        null,
        'msg-body-disclaimer',
        'msg-body-list',
        'msg-body-product',
        'msg-body-ads'
    ];
    var CONTENT_QUOTE_CLASS_NAMES = [
        'msg-body-q1',
        'msg-body-q2',
        'msg-body-q3',
        'msg-body-q4',
        'msg-body-q5',
        'msg-body-q6',
        'msg-body-q7',
        'msg-body-q8',
        'msg-body-q9'
    ];
    var MAX_QUOTE_CLASS_NAME = 'msg-body-qmax';
    var OCTET_STREAM_TYPE = 'application/octet-stream';
    function sendActivity(obj) {
        return new MozActivity(obj);
    }
    return [
        require('./base_card')(require('template!./message_reader.html')),
        {
            createdCallback: function () {
                this.htmlBodyNodes = [];
                this._on('msg-up-btn', 'click', 'onPrevious');
                this._on('msg-down-btn', 'click', 'onNext');
                this._on('msg-reply-btn', 'click', 'onReplyMenu');
                this._on('msg-delete-btn', 'click', 'onDelete');
                this._on('msg-star-btn', 'click', 'onToggleStar');
                this._on('msg-move-btn', 'click', 'onMove');
                this._on('msg-mark-read-btn', 'click', 'onMarkRead');
                this._on('msg-envelope-bar', 'click', 'onEnvelopeClick');
                this._on('msg-reader-load-infobar', 'click', 'onLoadBarClick');
                this._emittedContentEvents = false;
                this.disableReply();
                this._builtBodyDom = false;
                this.handleBodyChange = this.handleBodyChange.bind(this);
                this.onMessageSuidNotFound = this.onMessageSuidNotFound.bind(this);
                this.onCurrentMessage = this.onCurrentMessage.bind(this);
            },
            onArgs: function (args) {
                this.model = args.model;
                this.messageSuid = args.messageSuid;
                var headerCursor = this.headerCursor = args.headerCursor || new HeaderCursor(this.model);
                headerCursor.on('messageSuidNotFound', this.onMessageSuidNotFound);
                headerCursor.latest('currentMessage', this.onCurrentMessage);
                headerCursor.setCurrentMessage(this.header);
            },
            _contextMenuType: {
                VIEW_CONTACT: 1,
                CREATE_CONTACT: 2,
                ADD_TO_CONTACT: 4,
                REPLY: 8,
                NEW_MESSAGE: 16
            },
            skipEmitContentEvents: true,
            _on: function (className, eventName, method, skipProtection) {
                this.getElementsByClassName(className)[0].addEventListener(eventName, function (evt) {
                    if (this.header || skipProtection) {
                        return this[method](evt);
                    }
                }.bind(this), false);
            },
            _setHeader: function (header) {
                this.header = header.makeCopy();
                this.hackMutationHeader = header;
                if (!this.header.isRead) {
                    this.header.setRead(true);
                } else {
                    this.readBtn.classList.remove('unread');
                    mozL10n.setAttributes(this.readBtn, 'message-mark-read-button');
                }
                this.starBtn.classList.toggle('msg-star-btn-on', this.hackMutationHeader.isStarred);
                this.starBtn.setAttribute('aria-pressed', this.hackMutationHeader.isStarred);
                this.emit('header');
            },
            postInsert: function () {
                this._inDom = true;
                if (this._afterInDomMessage) {
                    this.onCurrentMessage(this._afterInDomMessage);
                    this._afterInDomMessage = null;
                }
            },
            told: function (args) {
                if (args.messageSuid) {
                    this.messageSuid = args.messageSuid;
                }
            },
            handleBodyChange: function (evt) {
                this.buildBodyDom(evt.changeDetails);
            },
            onBack: function (event) {
                cards.removeCardAndSuccessors(this, 'animate');
            },
            onPrevious: function (event) {
                this.headerCursor.advance('previous');
            },
            onNext: function (event) {
                this.headerCursor.advance('next');
            },
            onMessageSuidNotFound: function (messageSuid) {
                if (this.messageSuid === messageSuid) {
                    this.onBack();
                }
            },
            onCurrentMessage: function (currentMessage) {
                if (!this._inDom) {
                    this._afterInDomMessage = currentMessage;
                    return;
                }
                if (this.header && this.header.id === currentMessage.header.id) {
                    return;
                }
                this.messageSuid = null;
                this._setHeader(currentMessage.header);
                this.clearDom();
                this.latestOnce('header', function () {
                    this.buildHeaderDom(this);
                    this.header.getBody({ downloadBodyReps: true }, function (body) {
                        if (this.header.id !== body.id) {
                            return;
                        }
                        this.body = body;
                        body.onchange = this.handleBodyChange;
                        if (body.bodyRepsDownloaded) {
                            this.buildBodyDom();
                        }
                    }.bind(this));
                }.bind(this));
                var hasPrevious = currentMessage.siblings.hasPrevious;
                this.previousBtn.disabled = !hasPrevious;
                this.previousIcon.classList[hasPrevious ? 'remove' : 'add']('icon-disabled');
                var hasNext = currentMessage.siblings.hasNext;
                this.nextBtn.disabled = !hasNext;
                this.nextIcon.classList[hasNext ? 'remove' : 'add']('icon-disabled');
            },
            reply: function () {
                cards.eatEventsUntilNextCard();
                var composer = this.header.replyToMessage(null, () => {
                    cards.pushCard('compose', 'animate', {
                        model: this.model,
                        composer: composer
                    });
                });
            },
            replyAll: function () {
                cards.eatEventsUntilNextCard();
                var composer = this.header.replyToMessage('all', () => {
                    cards.pushCard('compose', 'animate', {
                        model: this.model,
                        composer: composer
                    });
                });
            },
            forward: function () {
                var needToPrompt = this.header.hasAttachments || this.body.embeddedImageCount > 0;
                var forwardMessage = function () {
                    cards.eatEventsUntilNextCard();
                    var composer = this.header.forwardMessage('inline', () => {
                        cards.pushCard('compose', 'animate', {
                            model: this.model,
                            composer: composer
                        });
                    });
                }.bind(this);
                if (needToPrompt) {
                    var dialog = msgAttachmentDisabledConfirmNode.cloneNode(true);
                    ConfirmDialog.show(dialog, {
                        id: 'msg-attachment-disabled-ok',
                        handler: function () {
                            forwardMessage();
                        }
                    }, {
                        id: 'msg-attachment-disabled-cancel',
                        handler: null
                    });
                } else {
                    forwardMessage();
                }
            },
            canReplyAll: function () {
                var myAddresses = this.model.account.identities.map(function (ident) {
                    return ident.address;
                });
                var otherAddresses = (this.header.to || []).concat(this.header.cc || []);
                if (this.header.replyTo && this.header.replyTo.author) {
                    otherAddresses.push(this.header.replyTo.author);
                }
                for (var i = 0; i < otherAddresses.length; i++) {
                    var otherAddress = otherAddresses[i];
                    if (otherAddress.address && myAddresses.indexOf(otherAddress.address) == -1) {
                        return true;
                    }
                }
                return false;
            },
            onReplyMenu: function (event) {
                var contents = msgReplyMenuNode.cloneNode(true);
                cards.setStatusColor(contents);
                document.body.appendChild(contents);
                var formSubmit = function (evt) {
                    cards.setStatusColor();
                    document.body.removeChild(contents);
                    switch (evt.explicitOriginalTarget.className) {
                    case 'msg-reply-menu-reply':
                        this.reply();
                        break;
                    case 'msg-reply-menu-reply-all':
                        this.replyAll();
                        break;
                    case 'msg-reply-menu-forward':
                        this.forward();
                        break;
                    case 'msg-reply-menu-cancel':
                        break;
                    }
                    return false;
                }.bind(this);
                contents.addEventListener('submit', formSubmit);
                if (!this.canReplyAll()) {
                    contents.querySelector('.msg-reply-menu-reply-all').classList.add('collapsed');
                }
            },
            onDelete: function () {
                var dialog = msgDeleteConfirmNode.cloneNode(true);
                var content = dialog.getElementsByTagName('p')[0];
                mozL10n.setAttributes(content, 'message-edit-delete-confirm');
                ConfirmDialog.show(dialog, {
                    id: 'msg-delete-ok',
                    handler: function () {
                        var op = this.header.deleteMessage();
                        cards.removeCardAndSuccessors(this, 'animate');
                        toaster.toastOperation(op);
                    }.bind(this)
                }, {
                    id: 'msg-delete-cancel',
                    handler: null
                });
            },
            onToggleStar: function () {
                this.starBtn.classList.toggle('msg-star-btn-on', !this.hackMutationHeader.isStarred);
                this.hackMutationHeader.isStarred = !this.hackMutationHeader.isStarred;
                this.starBtn.setAttribute('aria-pressed', this.hackMutationHeader.isStarred);
                this.header.setStarred(this.hackMutationHeader.isStarred);
            },
            onMove: function () {
                cards.folderSelector(this.model, function (folder) {
                    var op = this.header.moveMessage(folder);
                    cards.removeCardAndSuccessors(this, 'animate');
                    toaster.toastOperation(op);
                }.bind(this), function (folder) {
                    return folder.isValidMoveTarget;
                });
            },
            setRead: function (isRead) {
                this.hackMutationHeader.isRead = isRead;
                this.header.setRead(isRead);
                this.readBtn.classList.toggle('unread', !isRead);
                mozL10n.setAttributes(this.readBtn, isRead ? 'message-mark-read-button' : 'message-mark-unread-button');
            },
            onMarkRead: function () {
                this.setRead(!this.hackMutationHeader.isRead);
            },
            onEnvelopeClick: function (event) {
                var target = event.target;
                if (!target.classList.contains('msg-peep-bubble')) {
                    return;
                }
                this.onPeepClick(target);
            },
            onPeepClick: function (target) {
                var contents = msgContactMenuNode.cloneNode(true);
                var peep = target.peep;
                var headerNode = contents.getElementsByTagName('header')[0];
                Marquee.setup(peep.address, headerNode);
                document.body.appendChild(contents);
                Marquee.activate('alternate', 'ease');
                var formSubmit = function (evt) {
                    document.body.removeChild(contents);
                    switch (evt.explicitOriginalTarget.className) {
                    case 'msg-contact-menu-new':
                        cards.pushCard('compose', 'animate', {
                            model: this.model,
                            composerData: {
                                message: this.header,
                                onComposer: function (composer) {
                                    composer.to = [{
                                            address: peep.address,
                                            name: peep.name
                                        }];
                                }
                            }
                        });
                        break;
                    case 'msg-contact-menu-view':
                        sendActivity({
                            name: 'open',
                            data: {
                                type: 'webcontacts/contact',
                                params: { 'id': peep.contactId }
                            }
                        });
                        break;
                    case 'msg-contact-menu-create-contact':
                        var params = { 'email': peep.address };
                        if (peep.name) {
                            params.givenName = peep.name;
                        }
                        sendActivity({
                            name: 'new',
                            data: {
                                type: 'webcontacts/contact',
                                params: params
                            }
                        });
                        break;
                    case 'msg-contact-menu-add-to-existing-contact':
                        sendActivity({
                            name: 'update',
                            data: {
                                type: 'webcontacts/contact',
                                params: { 'email': peep.address }
                            }
                        });
                        break;
                    case 'msg-contact-menu-reply':
                        var composer = this.header.replyToMessage(null, () => {
                            cards.pushCard('compose', 'animate', {
                                model: this.model,
                                composer: composer
                            });
                        });
                        break;
                    }
                    return false;
                }.bind(this);
                contents.addEventListener('submit', formSubmit);
                var contextMenuOptions = this._contextMenuType.NEW_MESSAGE;
                var messageType = peep.type;
                if (messageType === 'from') {
                    contextMenuOptions |= this._contextMenuType.REPLY;
                }
                if (peep.isContact) {
                    contextMenuOptions |= this._contextMenuType.VIEW_CONTACT;
                } else {
                    contextMenuOptions |= this._contextMenuType.CREATE_CONTACT;
                    contextMenuOptions |= this._contextMenuType.ADD_TO_CONTACT;
                }
                if (contextMenuOptions & this._contextMenuType.VIEW_CONTACT) {
                    contents.querySelector('.msg-contact-menu-view').classList.remove('collapsed');
                }
                if (contextMenuOptions & this._contextMenuType.CREATE_CONTACT) {
                    contents.querySelector('.msg-contact-menu-create-contact').classList.remove('collapsed');
                }
                if (contextMenuOptions & this._contextMenuType.ADD_TO_CONTACT) {
                    contents.querySelector('.msg-contact-menu-add-to-existing-contact').classList.remove('collapsed');
                }
                if (contextMenuOptions & this._contextMenuType.REPLY) {
                    contents.querySelector('.msg-contact-menu-reply').classList.remove('collapsed');
                }
                if (contextMenuOptions & this._contextMenuType.NEW_MESSAGE) {
                    contents.querySelector('.msg-contact-menu-new').classList.remove('collapsed');
                }
            },
            onLoadBarClick: function (event) {
                var self = this;
                var loadBar = this.loadBar;
                if (!this.body.embeddedImagesDownloaded) {
                    this.body.downloadEmbeddedImages(function () {
                        if (!self.body) {
                            return;
                        }
                        for (var i = 0; i < self.htmlBodyNodes.length; i++) {
                            self.body.showEmbeddedImages(self.htmlBodyNodes[i], self.iframeResizeHandler);
                        }
                    });
                    loadBar.classList.add('collapsed');
                } else {
                    for (var i = 0; i < this.htmlBodyNodes.length; i++) {
                        this.body.showExternalImages(this.htmlBodyNodes[i], this.iframeResizeHandler);
                    }
                    loadBar.classList.add('collapsed');
                }
            },
            getAttachmentBlob: function (attachment, callback) {
                try {
                    var storageType = attachment._file[0];
                    var filename = attachment._file[1];
                    var storage = navigator.getDeviceStorage(storageType);
                    var getreq = storage.get(filename);
                    getreq.onerror = function () {
                        console.warn('Could not open attachment file: ', filename, getreq.error.name);
                    };
                    getreq.onsuccess = function () {
                        var blob = getreq.result;
                        callback(blob);
                    };
                } catch (ex) {
                    console.warn('Exception getting attachment from device storage:', attachment._file, '\n', ex, '\n', ex.stack);
                }
            },
            onDownloadAttachmentClick: function (node, attachment) {
                node.setAttribute('state', 'downloading');
                var registerWithDownloadManager = true;
                attachment.download(function downloaded() {
                    if (!attachment._file) {
                        return;
                    }
                    node.setAttribute('state', 'downloaded');
                }, null, registerWithDownloadManager);
            },
            onViewAttachmentClick: function (node, attachment) {
                console.log('trying to open', attachment._file, 'known type:', attachment.mimetype);
                if (!attachment._file) {
                    return;
                }
                if (attachment.isDownloaded) {
                    this.getAttachmentBlob(attachment, function (blob) {
                        try {
                            if (!blob) {
                                throw new Error('Blob does not exist');
                            }
                            var useType = attachment.mimetype;
                            if (!useType || useType === OCTET_STREAM_TYPE) {
                                useType = blob.type;
                            }
                            if (!useType || useType === OCTET_STREAM_TYPE) {
                                useType = MimeMapper.guessTypeFromFileProperties(attachment.filename, OCTET_STREAM_TYPE);
                            }
                            if (!useType) {
                                useType = OCTET_STREAM_TYPE;
                            }
                            console.log('triggering open activity with MIME type:', useType);
                            var activity = new MozActivity({
                                name: 'open',
                                data: {
                                    type: useType,
                                    filename: attachment.filename,
                                    blob: blob,
                                    url: attachment.filename
                                }
                            });
                            activity.onerror = function () {
                                console.warn('Problem with "open" activity', activity.error.name);
                                if (activity.error.name === 'NO_PROVIDER') {
                                    var dialog = msgAttachmentDidNotOpenAlertNode.cloneNode(true);
                                    ConfirmDialog.show(dialog, {
                                        id: 'msg-attachment-did-not-open-ok',
                                        handler: null
                                    }, { handler: null });
                                }
                            };
                            activity.onsuccess = function () {
                                console.log('"open" activity allegedly succeeded');
                            };
                        } catch (ex) {
                            console.warn('Problem creating "open" activity:', ex, '\n', ex.stack);
                        }
                    });
                }
            },
            onHyperlinkClick: function (event, linkNode, linkUrl, linkText) {
                if (/^mailto:/i.test(linkUrl)) {
                    var data = queryURI(linkUrl);
                    cards.pushCard('compose', 'animate', {
                        model: this.model,
                        composerData: {
                            onComposer: (composer, composeCard) => {
                                Object.keys(data).forEach(key => {
                                    if (key === 'to' || key === 'cc' || key === 'bcc') {
                                        composer[key] = data[key].map(addr => {
                                            return this.model.api.parseMailbox(addr).address;
                                        }).filter(value => {
                                            return value;
                                        });
                                    } else {
                                        composer[key] = data[key];
                                    }
                                });
                            }
                        }
                    });
                } else {
                    var dialog = msgBrowseConfirmNode.cloneNode(true);
                    var content = dialog.getElementsByTagName('p')[0];
                    mozL10n.setAttributes(content, 'browse-to-url-prompt', { url: linkUrl });
                    ConfirmDialog.show(dialog, {
                        id: 'msg-browse-ok',
                        handler: function () {
                            sendActivity({
                                name: 'view',
                                data: {
                                    type: 'url',
                                    url: linkUrl
                                }
                            });
                        }.bind(this)
                    }, {
                        id: 'msg-browse-cancel',
                        handler: null
                    });
                }
            },
            _populatePlaintextBodyNode: function (bodyNode, rep) {
                for (var i = 0; i < rep.length; i += 2) {
                    var node = document.createElement('div'), cname;
                    var etype = rep[i] & 15;
                    if (etype === 4) {
                        var qdepth = (rep[i] >> 8 & 255) + 1;
                        if (qdepth > 8) {
                            cname = MAX_QUOTE_CLASS_NAME;
                        } else {
                            cname = CONTENT_QUOTE_CLASS_NAMES[qdepth];
                        }
                    } else {
                        cname = CONTENT_TYPES_TO_CLASS_NAMES[etype];
                    }
                    if (cname) {
                        node.setAttribute('class', cname);
                    }
                    var subnodes = this.model.api.utils.linkifyPlain(rep[i + 1], document);
                    for (var iNode = 0; iNode < subnodes.length; iNode++) {
                        node.appendChild(subnodes[iNode]);
                    }
                    bodyNode.appendChild(node);
                }
            },
            buildHeaderDom: function (domNode) {
                var header = this.header;
                function updatePeep(peep) {
                    var nameNode = peep.element.querySelector('.msg-peep-content');
                    if (peep.type === 'from') {
                        domNode.querySelector('.msg-reader-header-label').textContent = peep.name || peep.address;
                        nameNode.textContent = peep.address;
                        nameNode.classList.add('msg-peep-address');
                    } else {
                        nameNode.textContent = peep.name || peep.address;
                        if (!peep.name && peep.address) {
                            nameNode.classList.add('msg-peep-address');
                        } else {
                            nameNode.classList.remove('msg-peep-address');
                        }
                    }
                }
                function addHeaderEmails(type, peeps) {
                    var lineClass = 'msg-envelope-' + type + '-line';
                    var lineNode = domNode.getElementsByClassName(lineClass)[0];
                    if (!peeps || !peeps.length) {
                        lineNode.classList.add('collapsed');
                        return;
                    }
                    lineNode.classList.remove('collapsed');
                    var peepTemplate = msgPeepBubbleNode;
                    for (var i = 0; i < peeps.length; i++) {
                        var peep = peeps[i];
                        peep.type = type;
                        peep.element = peepTemplate.cloneNode(true);
                        peep.element.peep = peep;
                        peep.onchange = updatePeep;
                        updatePeep(peep);
                        lineNode.appendChild(peep.element);
                    }
                }
                addHeaderEmails('from', [header.author]);
                addHeaderEmails('to', header.to);
                addHeaderEmails('cc', header.cc);
                addHeaderEmails('bcc', header.bcc);
                var dateNode = domNode.querySelector('.msg-envelope-date');
                var dateTime = dateNode.dataset.time = header.date.valueOf();
                date.relativeDateElement(dateNode, dateTime);
                messageDisplay.subject(domNode.querySelector('.msg-envelope-subject'), header);
            },
            clearDom: function () {
                Array.slice(this.querySelectorAll('.msg-peep-bubble')).forEach(function (node) {
                    node.parentNode.removeChild(node);
                });
                var attachmentsContainer = this.querySelector('.msg-attachments-container');
                attachmentsContainer.innerHTML = '';
                this.rootBodyNode.innerHTML = '<progress data-l10n-id="message-body-container-progress"></progress>';
                this.loadBar.classList.add('collapsed');
            },
            buildBodyDom: function (changeDetails) {
                var body = this.body;
                if (!body || this.header.id !== body.id) {
                    return;
                }
                var domNode = this, rootBodyNode = this.rootBodyNode, reps = body.bodyReps, hasExternalImages = false, showEmbeddedImages = body.embeddedImageCount && body.embeddedImagesDownloaded;
                if (!this._builtBodyDom) {
                    iframeShims.bindSanitizedClickHandler(rootBodyNode, this.onHyperlinkClick.bind(this), rootBodyNode, null);
                    this._builtBodyDom = true;
                }
                if (reps.length && reps[0].isDownloaded) {
                    var progressNode = rootBodyNode.querySelector('progress');
                    if (progressNode) {
                        progressNode.parentNode.removeChild(progressNode);
                    }
                }
                for (var iRep = 0; iRep < reps.length; iRep++) {
                    var rep = reps[iRep];
                    var repNode = rootBodyNode.childNodes[iRep];
                    if (!repNode) {
                        repNode = rootBodyNode.appendChild(document.createElement('div'));
                    }
                    if (changeDetails && changeDetails.bodyReps && changeDetails.bodyReps.indexOf(iRep) === -1) {
                        continue;
                    }
                    repNode.innerHTML = '';
                    if (rep.type === 'plain') {
                        this._populatePlaintextBodyNode(repNode, rep.content);
                    } else if (rep.type === 'html') {
                        var iframeShim = iframeShims.createAndInsertIframeForContent(rep.content, this.scrollContainer, repNode, null, 'interactive', this.onHyperlinkClick.bind(this));
                        var iframe = iframeShim.iframe;
                        var bodyNode = iframe.contentDocument.body;
                        this.iframeResizeHandler = iframeShim.resizeHandler;
                        this.model.api.utils.linkifyHTML(iframe.contentDocument);
                        this.htmlBodyNodes.push(bodyNode);
                        if (body.checkForExternalImages(bodyNode)) {
                            hasExternalImages = true;
                        }
                        if (showEmbeddedImages) {
                            body.showEmbeddedImages(bodyNode, this.iframeResizeHandler);
                        }
                    }
                }
                var loadBar = this.loadBar;
                if (body.embeddedImageCount && !body.embeddedImagesDownloaded) {
                    loadBar.classList.remove('collapsed');
                    mozL10n.setAttributes(this.loadBarText, 'message-download-images-tap', { n: body.embeddedImageCount });
                } else if (hasExternalImages) {
                    loadBar.classList.remove('collapsed');
                    mozL10n.setAttributes(this.loadBarText, 'message-show-external-images');
                } else {
                    loadBar.classList.add('collapsed');
                }
                var attachmentsContainer = domNode.querySelector('.msg-attachments-container');
                if (body.attachments && body.attachments.length) {
                    attachmentsContainer.classList.remove('collapsed');
                    require(['shared/js/mime_mapper'], function (mapper) {
                        if (!MimeMapper) {
                            MimeMapper = mapper;
                        }
                        var attTemplate = msgAttachmentItemNode, filenameTemplate = attTemplate.querySelector('.msg-attachment-filename'), filesizeTemplate = attTemplate.querySelector('.msg-attachment-filesize');
                        for (var iAttach = 0; iAttach < body.attachments.length; iAttach++) {
                            var attNode = attachmentsContainer.childNodes[iAttach];
                            if (!attNode) {
                                attNode = attachmentsContainer.appendChild(document.createElement('li'));
                            }
                            if (changeDetails && changeDetails.attachments && changeDetails.attachments.indexOf(iAttach) === -1) {
                                continue;
                            }
                            var attachment = body.attachments[iAttach], state;
                            var extension = attachment.filename.split('.').pop();
                            var MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024;
                            var attachmentDownloadable = true;
                            var mimeClass = mimeToClass(attachment.mimetype || MimeMapper.guessTypeFromExtension(extension));
                            if (attachment.isDownloaded) {
                                state = 'downloaded';
                            } else if (!attachment.isDownloadable) {
                                state = 'nodownload';
                                attachmentDownloadable = false;
                            } else if (attachment.sizeEstimateInBytes > MAX_ATTACHMENT_SIZE) {
                                state = 'toolarge';
                                attachmentDownloadable = false;
                            } else {
                                state = 'downloadable';
                            }
                            attTemplate.setAttribute('state', state);
                            filenameTemplate.textContent = attachment.filename;
                            fileDisplay.fileSize(filesizeTemplate, attachment.sizeEstimateInBytes);
                            var attachmentNode = attTemplate.cloneNode(true);
                            attachmentNode.classList.add(mimeClass);
                            attachmentsContainer.replaceChild(attachmentNode, attNode);
                            var downloadButton = attachmentNode.querySelector('.msg-attachment-download');
                            downloadButton.disabled = !attachmentDownloadable;
                            if (attachmentDownloadable) {
                                downloadButton.addEventListener('click', this.onDownloadAttachmentClick.bind(this, attachmentNode, attachment));
                            }
                            attachmentNode.setAttribute('aria-disabled', !attachmentDownloadable);
                            attachmentNode.querySelector('.msg-attachment-view').addEventListener('click', this.onViewAttachmentClick.bind(this, attachmentNode, attachment));
                            this.enableReply();
                        }
                    }.bind(this));
                } else {
                    attachmentsContainer.classList.add('collapsed');
                    this.enableReply();
                }
            },
            disableReply: function () {
                var btn = this.querySelector('.msg-reply-btn');
                btn.setAttribute('aria-disabled', true);
            },
            enableReply: function () {
                var btn = this.querySelector('.msg-reply-btn');
                btn.removeAttribute('aria-disabled');
                if (!this._emittedContentEvents) {
                    evt.emit('metrics:contentDone');
                    this._emittedContentEvents = true;
                }
            },
            die: function () {
                var headerCursor = this.headerCursor;
                headerCursor.removeListener('messageSuidNotFound', this.onMessageSuidNotFound);
                headerCursor.removeListener('currentMessage', this.onCurrentMessage);
                if (this.header) {
                    this.header.__die();
                    this.header = null;
                }
                if (this.body) {
                    this.body.die();
                    this.body = null;
                }
            }
        }
    ];
});