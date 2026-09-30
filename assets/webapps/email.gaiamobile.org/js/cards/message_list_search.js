define([
    'require',
    'exports',
    'module',
    'shared/js/accessibility_helper',
    'cards',
    'container_listen',
    'date',
    'header_cursor',
    'message_display',
    'message_list_topbar',
    './lst/peep_dom',
    './lst/default_vscroll_data',
    './base_card',
    'template!./message_list_search.html',
    './lst/edit_controller',
    './lst/msg_click'
], function (require, exports) {
    var accessibilityHelper = require('shared/js/accessibility_helper'), cards = require('cards'), containerListen = require('container_listen'), date = require('date'), HeaderCursor = require('header_cursor'), messageDisplay = require('message_display'), MessageListTopBar = require('message_list_topbar'), updatePeepDom = require('./lst/peep_dom').update;
    var defaultSearchVScrollData = {
        header: require('./lst/default_vscroll_data'),
        matches: []
    };
    var MATCHED_TEXT_CLASS = 'highlight';
    function appendMatchItemTo(matchItem, node) {
        var text = matchItem.text;
        var idx = 0;
        for (var iRun = 0; iRun <= matchItem.matchRuns.length; iRun++) {
            var run;
            if (iRun === matchItem.matchRuns.length) {
                run = {
                    start: text.length,
                    length: 0
                };
            } else {
                run = matchItem.matchRuns[iRun];
            }
            if (run.start > idx) {
                var tnode = document.createTextNode(text.substring(idx, run.start));
                node.appendChild(tnode);
            }
            if (!run.length) {
                continue;
            }
            var hspan = document.createElement('span');
            hspan.classList.add(MATCHED_TEXT_CLASS);
            hspan.textContent = text.substr(run.start, run.length);
            node.appendChild(hspan);
            idx = run.start + run.length;
        }
    }
    return [
        require('./base_card')(require('template!./message_list_search.html')),
        require('./lst/edit_controller'),
        require('./lst/msg_click'),
        {
            createdCallback: function () {
                containerListen(this.querySelector('.filter'), 'click', this.onSearchFilterClick.bind(this));
                this.searchFilterTabs = this.querySelectorAll('.filter [role="tab"]');
                this.isFirstTimeVisible = true;
                this._folderChanged = this._folderChanged.bind(this);
                this.msgVScroll.on('emptyLayoutShown', function () {
                    this.editBtn.disabled = true;
                }.bind(this));
                this.msgVScroll.on('emptyLayoutHidden', function () {
                    this.editBtn.disabled = false;
                }.bind(this));
                this.msgVScroll.on('messagesChange', function (message, index) {
                    this.updateMatchedMessageDom(message);
                }.bind(this));
                this.msgVScroll.on('messagesComplete', function (newEmailCount) {
                    if (!this.msgVScroll.vScroll.list) {
                        this.msgVScroll.vScroll.setData(this.msgVScroll.listFunc);
                    }
                }.bind(this));
                var vScrollBindData = function bindSearch(model, node) {
                    model.element = node;
                    node.message = model.header;
                    this.updateMatchedMessageDom(model);
                }.bind(this);
                this.msgVScroll.init(this.scrollContainer, vScrollBindData, defaultSearchVScrollData);
                this._topBar = new MessageListTopBar(this.querySelector('.message-list-topbar'));
                this._topBar.bindToElements(this.scrollContainer, this.msgVScroll.vScroll);
            },
            onArgs: function (args) {
                var model = this.model = args.model;
                var headerCursor = this.headerCursor = args.headerCursor || new HeaderCursor(model);
                this.msgVScroll.setHeaderCursor(headerCursor);
                model.latest('folder', this._folderChanged);
            },
            onCardVisible: function () {
                if (this.isFirstTimeVisible) {
                    this.searchInput.focus();
                }
                this.msgVScroll.vScroll.nowVisible();
                this.isFirstTimeVisible = false;
            },
            showSearch: function (phrase, filter) {
                console.log('sf: showSearch. phrase:', phrase, phrase.length);
                this.curFolder = this.model.folder;
                this.editModeEnabled = true;
                this.msgVScroll.vScroll.clearDisplay();
                this.curPhrase = phrase;
                this.curFilter = filter;
                this.msgVScroll._snippetRequestPending = false;
                this.msgVScroll.waitingOnChunk = true;
                this.headerCursor.startSearch(phrase, {
                    author: filter === 'all' || filter === 'author',
                    recipients: filter === 'all' || filter === 'recipients',
                    subject: filter === 'all' || filter === 'subject',
                    body: filter === 'all' || filter === 'body'
                });
                return true;
            },
            onSearchFilterClick: function (filterNode, event) {
                accessibilityHelper.setAriaSelected(filterNode.firstElementChild, this.searchFilterTabs);
                this.showSearch(this.searchInput.value, filterNode.dataset.filter);
            },
            onSearchTextChange: function (event) {
                console.log('sf: typed, now:', this.searchInput.value);
                this.showSearch(this.searchInput.value, this.curFilter);
            },
            onSearchSubmit: function (event) {
                event.preventDefault();
                this.searchInput.blur();
            },
            onCancelSearch: function (event) {
                if (event.explicitOriginalTarget !== event.target) {
                    return;
                }
                try {
                    this.headerCursor.endSearch();
                } catch (ex) {
                    console.error('problem killing slice:', ex, '\n', ex.stack);
                }
                cards.removeCardAndSuccessors(this, 'animate');
            },
            onClearSearch: function () {
                this.showSearch('', this.curFilter);
            },
            editModeChanged: function (enabled) {
                if (enabled) {
                    cards.setStatusColor(this.editHeader);
                } else {
                    cards.setStatusColor(this);
                }
            },
            updateMatchedMessageDom: function (matchedHeader) {
                var msgNode = matchedHeader.element, matches = matchedHeader.matches, message = matchedHeader.header;
                if (!msgNode) {
                    return;
                }
                var classAction = message.isPlaceholderData ? 'add' : 'remove';
                var defaultDataClass = this.msgVScroll.vScroll.itemDefaultDataClass;
                msgNode.classList[classAction](defaultDataClass);
                msgNode.dataset.id = matchedHeader.id;
                var dateNode = msgNode.querySelector('.msg-header-date');
                var subjectNode = msgNode.querySelector('.msg-header-subject');
                var authorNode = msgNode.querySelector('.msg-header-author');
                if (matches.author) {
                    authorNode.textContent = '';
                    appendMatchItemTo(matches.author, authorNode);
                } else {
                    message.author.element = authorNode;
                    message.author.onchange = updatePeepDom;
                    message.author.onchange(message.author);
                }
                var dateTime = dateNode.dataset.time = message.date.valueOf();
                date.relativeDateElement(dateNode, dateTime);
                if (matches.subject) {
                    subjectNode.textContent = '';
                    appendMatchItemTo(matches.subject[0], subjectNode);
                } else {
                    messageDisplay.subject(subjectNode, message);
                }
                var snippetNode = msgNode.querySelector('.msg-header-snippet');
                if (matches.body) {
                    snippetNode.textContent = '';
                    appendMatchItemTo(matches.body[0], snippetNode);
                } else {
                    snippetNode.textContent = message.snippet;
                }
                var attachmentsNode = msgNode.querySelector('.msg-header-attachments');
                attachmentsNode.classList.toggle('msg-header-attachments-yes', message.hasAttachments);
                snippetNode.classList.toggle('icon-short', message.hasAttachments);
                msgNode.classList.toggle('unread', !message.isRead);
                var starNode = msgNode.querySelector('.msg-header-star');
                starNode.classList.toggle('msg-header-star-starred', message.isStarred);
                subjectNode.classList.toggle('icon-short', message.isStarred);
                this.updateDomSelectState(msgNode, message);
            },
            _folderChanged: function (folder) {
                if (!this.model.foldersSlice) {
                    return;
                }
                this.curFolder = folder;
                this.showSearch('', 'all');
            },
            die: function () {
                this.msgVScroll.die();
                this.model.removeListener('folder', this._folderChanged);
            }
        }
    ];
});