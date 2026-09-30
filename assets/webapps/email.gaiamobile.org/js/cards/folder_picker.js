define([
    'require',
    'container_listen',
    'tmpl!./fld/folder_item.html',
    'tmpl!./fld/account_item.html',
    'folder_depth_classes',
    'cards',
    'evt',
    'transition_end',
    'css!style/folder_cards',
    './base_card',
    'template!./folder_picker.html'
], function (require) {
    var containerListen = require('container_listen'), fldFolderItemNode = require('tmpl!./fld/folder_item.html'), fldAccountItemNode = require('tmpl!./fld/account_item.html'), FOLDER_DEPTH_CLASSES = require('folder_depth_classes'), cards = require('cards'), evt = require('evt'), transitionEnd = require('transition_end');
    require('css!style/folder_cards');
    return [
        require('./base_card')(require('template!./folder_picker.html')),
        {
            createdCallback: function () {
                containerListen(this.foldersContainer, 'click', this.onClickFolder.bind(this));
                containerListen(this.accountListContainer, 'click', this.onClickAccount.bind(this));
                transitionEnd(this, this.onTransitionEnd.bind(this));
                this.updateAccount = this.updateAccount.bind(this);
            },
            onArgs: function (args) {
                var model = this.model = args.model;
                model.latest('account', this.updateAccount);
                var accountCount = model.getAccountCount();
                if (accountCount > 1) {
                    this.classList.remove('one-account');
                    this.currentAccountContainerHeight = this.accountHeader.getBoundingClientRect().height * accountCount;
                    this.hideAccounts();
                }
                this.acctsSlice = model.api.viewAccounts(false);
                this.acctsSlice.onsplice = this.onAccountsSplice.bind(this);
                this.acctsSlice.onchange = this.onAccountsChange.bind(this);
            },
            extraClasses: [
                'anim-vertical',
                'anim-overlay',
                'one-account'
            ],
            onShowSettings: function (event) {
                cards.pushCard('settings_main', 'animate');
            },
            updateAccount: function (account) {
                var oldAccount = this.curAccount;
                this.mostRecentSyncTimestamp = 0;
                if (oldAccount !== account) {
                    this.foldersContainer.innerHTML = '';
                    this.model.latestOnce('folder', function (folder) {
                        this.curAccount = account;
                        this.querySelector('.fld-acct-header-account-label').textContent = account.name;
                        if (!this.curFolder) {
                            this.curFolder = folder;
                        }
                        if (this.foldersSlice) {
                            this.foldersSlice.onsplice = null;
                            this.foldersSlice.onchange = null;
                        }
                        this.foldersSlice = this.model.foldersSlice;
                        this.onFoldersSplice(0, 0, this.foldersSlice.items, true, false);
                        this.foldersSlice.onsplice = this.onFoldersSplice.bind(this);
                    }.bind(this));
                }
            },
            onClickAccount: function (accountNode, event) {
                var oldAccountId = this.curAccount.id, accountId = accountNode.account.id;
                this.curAccount = accountNode.account;
                if (oldAccountId !== accountId) {
                    this._waitingAccountId = accountId;
                    this._closeCard();
                }
            },
            toggleAccounts: function () {
                var hadAnimated = this.fldAcctContainer.classList.contains('animated');
                if (!hadAnimated) {
                    this.fldAcctContainer.classList.add('animated');
                    this.fldAcctContainer.clientWidth;
                }
                if (this.accountHeader.classList.contains('closed')) {
                    this.showAccounts();
                } else {
                    this.hideAccounts();
                }
            },
            showAccounts: function () {
                var height = this.currentAccountContainerHeight;
                this.fldAcctScrollInner.style.height = height + this.foldersContainer.getBoundingClientRect().height + 'px';
                this.fldAcctContainer.style.transform = 'translateY(0)';
                this.accountHeader.classList.remove('closed');
            },
            hideAccounts: function () {
                var foldersHeight = this.foldersContainer.getBoundingClientRect().height;
                if (foldersHeight) {
                    this.fldAcctScrollInner.style.height = foldersHeight + 'px';
                }
                this.fldAcctContainer.style.transform = 'translateY(-' + this.currentAccountContainerHeight + 'px)';
                this.accountHeader.classList.add('closed');
            },
            onAccountsSplice: function (index, howMany, addedItems, requested, moreExpected) {
                var accountListContainer = this.accountListContainer;
                var postSliceCount = this.acctsSlice.items.length + addedItems.length - howMany;
                this.classList.toggle('one-account', postSliceCount <= 1);
                var account;
                if (howMany) {
                    for (var i = index + howMany - 1; i >= index; i--) {
                        account = this.acctsSlice.items[i];
                        if (account.element) {
                            accountListContainer.removeChild(account.element);
                        }
                    }
                }
                var insertBuddy = index >= accountListContainer.childElementCount ? null : accountListContainer.children[index];
                addedItems.forEach(function (account) {
                    var accountNode = account.element = fldAccountItemNode.cloneNode(true);
                    accountNode.account = account;
                    this.updateAccountDom(account, true);
                    accountListContainer.insertBefore(accountNode, insertBuddy);
                }.bind(this));
                this.currentAccountContainerHeight = this.accountHeader.getBoundingClientRect().height * accountListContainer.children.length;
                this.hideAccounts();
            },
            onAccountsChange: function (account) {
                this.updateAccountDom(account, false);
            },
            updateAccountDom: function (account, firstTime) {
                var accountNode = account.element;
                if (firstTime) {
                    accountNode.querySelector('.fld-account-name').textContent = account.name;
                    if (this.curAccount && this.curAccount.id === account.id) {
                        accountNode.classList.add('fld-account-selected');
                    }
                }
            },
            onFoldersSplice: function (index, howMany, addedItems, requested, moreExpected) {
                var foldersContainer = this.foldersContainer;
                var folder;
                if (howMany) {
                    for (var i = index + howMany - 1; i >= index; i--) {
                        folder = this.foldersSlice.items[i];
                        foldersContainer.removeChild(folder.element);
                    }
                }
                var insertBuddy = index >= foldersContainer.childElementCount ? null : foldersContainer.children[index], self = this;
                addedItems.forEach(function (folder) {
                    var folderNode = folder.element = fldFolderItemNode.cloneNode(true);
                    folderNode.folder = folder;
                    self.updateFolderDom(folder, true);
                    foldersContainer.insertBefore(folderNode, insertBuddy);
                });
            },
            updateFolderDom: function (folder, firstTime) {
                var folderNode = folder.element;
                if (firstTime) {
                    if (!folder.selectable) {
                        folderNode.classList.add('fld-folder-unselectable');
                    }
                    var depthIdx = Math.min(FOLDER_DEPTH_CLASSES.length - 1, folder.depth);
                    folderNode.classList.add(FOLDER_DEPTH_CLASSES[depthIdx]);
                    if (depthIdx > 0) {
                        folderNode.classList.add('fld-folder-depthnonzero');
                    }
                    folderNode.querySelector('.fld-folder-name').textContent = folder.name;
                    folderNode.dataset.type = folder.type;
                }
                if (folder === this.curFolder) {
                    folderNode.classList.add('fld-folder-selected');
                } else {
                    folderNode.classList.remove('fld-folder-selected');
                }
            },
            onClickFolder: function (folderNode, event) {
                var folder = folderNode.folder;
                if (!folder.selectable) {
                    return;
                }
                var oldFolder = this.curFolder;
                this.curFolder = folder;
                this.updateFolderDom(oldFolder);
                this.updateFolderDom(folder);
                this._showFolder(folder);
                this._closeCard();
            },
            onTransitionEnd: function (event) {
                if (!this.classList.contains('opened') && event.target.classList.contains('fld-content')) {
                    cards.removeCardAndSuccessors(this, 'none');
                    if (this._waitingAccountId) {
                        var model = this.model;
                        model.changeAccountFromId(this._waitingAccountId, function () {
                            model.selectInbox();
                        });
                        this._waitingAccountId = null;
                    }
                }
            },
            _closeCard: function () {
                evt.emit('folderPickerClosing');
                this.classList.remove('opened');
            },
            _showFolder: function (folder) {
                this.model.changeFolder(folder);
            },
            onCardVisible: function () {
                this.classList.add('opened');
            },
            die: function () {
                this.acctsSlice.die();
                this.model.removeListener('account', this.updateAccount);
            }
        }
    ];
});