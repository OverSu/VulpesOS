define([
    'mailbuild',
    '../mailchew',
    '../util'
], function (MimeNode, $mailchew, $imaputil) {
    var formatAddresses = $imaputil.formatAddresses;
    MimeNode.prototype.removeHeader = function (key) {
        for (var i = 0, len = this._headers.length; i < len; i++) {
            if (this._headers[i].key === key) {
                this._headers.splice(i, 1);
                break;
            }
        }
    };
    function normalizeNewlines(body) {
        return body.replace(/\r?\n|\r/g, '\r\n');
    }
    function Composer(newRecords, account, identity) {
        var header = this.header = newRecords.header;
        var body = this.body = newRecords.body;
        this.account = account;
        this.identity = identity;
        this.sentDate = new Date(this.header.date);
        this._smartWakeLock = null;
        this.messageId = '<' + Date.now() + Math.random().toString(16).substr(1) + '@mozgaia>';
        var messageNode;
        var textContent = body.bodyReps[0].content[1];
        if (body.bodyReps.length === 2) {
            var htmlContent = body.bodyReps[1].content;
            messageNode = new MimeNode('text/html');
            messageNode.setContent(normalizeNewlines($mailchew.mergeUserTextWithHTML(textContent, htmlContent)));
        } else {
            messageNode = new MimeNode('text/plain');
            messageNode.setContent(normalizeNewlines(textContent));
        }
        var root;
        if (body.attachments.length) {
            root = this._rootNode = new MimeNode('multipart/mixed');
            root.appendChild(messageNode);
        } else {
            root = this._rootNode = messageNode;
        }
        root.setHeader('From', formatAddresses([this.identity]));
        root.setHeader('Subject', header.subject);
        if (this.identity.replyTo) {
            root.setHeader('Reply-To', this.identity.replyTo);
        }
        if (header.to && header.to.length) {
            root.setHeader('To', formatAddresses(header.to));
        }
        if (header.cc && header.cc.length) {
            root.setHeader('Cc', formatAddresses(header.cc));
        }
        if (header.bcc && header.bcc.length) {
            root.setHeader('Bcc', formatAddresses(header.bcc));
        }
        root.setHeader('User-Agent', 'GaiaMail/0.2');
        root.setHeader('Date', this.sentDate.toUTCString());
        root.setHeader('Message-Id', this.messageId);
        if (body.references) {
            root.setHeader('References', body.references);
        }
        root.setHeader('Content-Transfer-Encoding', 'quoted-printable');
        this._blobReplacements = [];
        this._uniqueBlobBoundary = '{{blob!' + Math.random() + Date.now() + '}}';
        body.attachments.forEach(function (attachment) {
            try {
                var attachmentNode = new MimeNode(attachment.type, { filename: attachment.name });
                attachmentNode.setHeader('Content-Transfer-Encoding', 'base64');
                attachmentNode.setContent(this._uniqueBlobBoundary);
                root.appendChild(attachmentNode);
                this._blobReplacements.push(new Blob(attachment.file));
            } catch (ex) {
                console.error('Problem attaching attachment:', ex, '\n', ex.stack);
            }
        }.bind(this));
    }
    Composer.prototype = {
        getEnvelope: function () {
            return this._rootNode.getEnvelope();
        },
        withMessageBlob: function (opts, callback) {
            var TEMP_BCC = 'Bcc-Temp';
            var TEMP_BCC_REGEX = /^Bcc-Temp: /m;
            var hasBcc = opts.includeBcc && this.header.bcc && this.header.bcc.length;
            if (hasBcc) {
                this._rootNode.setHeader(TEMP_BCC, formatAddresses(this.header.bcc));
            } else {
                this._rootNode.removeHeader(TEMP_BCC);
            }
            var str = this._rootNode.build();
            if (opts.smtp) {
                str = str.replace(/\n\./g, '\n..');
            }
            if (hasBcc) {
                str = str.replace(TEMP_BCC_REGEX, 'Bcc: ');
            }
            if (str.slice(-2) !== '\r\n') {
                str += '\r\n';
            }
            var splits = str.split(btoa(this._uniqueBlobBoundary) + '\r\n');
            this._blobReplacements.forEach(function (blob, i) {
                splits.splice(i * 2 + 1, 0, blob);
            });
            callback(new Blob(splits, { type: this._rootNode.getHeader('content-type') }));
        },
        setSmartWakeLock: function (wakeLock) {
            this._smartWakeLock = wakeLock;
        },
        renewSmartWakeLock: function (reason) {
            if (this._smartWakeLock) {
                this._smartWakeLock.renew(reason);
            }
        }
    };
    return { Composer: Composer };
});