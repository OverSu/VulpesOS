(function (root, factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define([
            'mimefuncs',
            'mimetypes',
            'punycode',
            'addressparser'
        ], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory(require('mimefuncs'), require('mimetypes'), require('punycode'), require('wo-addressparser'));
    } else {
        root.mailbuild = factory(mimefuncs, mimetypes, punycode, addressparser);
    }
}(this, function (mimefuncs, mimetypes, punycode, addressparser) {
    'use strict';
    function MimeNode(contentType, options) {
        this.nodeCounter = 0;
        options = options || {};
        this.baseBoundary = options.baseBoundary || Date.now().toString() + Math.random();
        this.date = new Date();
        this.rootNode = options.rootNode || this;
        if (options.filename) {
            this.filename = options.filename;
            if (!contentType) {
                contentType = mimetypes.detectMimeType(this.filename.split('.').pop());
            }
        }
        this.parentNode = options.parentNode;
        this._nodeId = ++this.rootNode.nodeCounter;
        this._childNodes = [];
        this._headers = [];
        if (contentType) {
            this.setHeader('content-type', contentType);
        }
    }
    MimeNode.prototype.createChild = function (contentType, options) {
        if (!options && typeof contentType === 'object') {
            options = contentType;
            contentType = undefined;
        }
        var node = new MimeNode(contentType, options);
        this.appendChild(node);
        return node;
    };
    MimeNode.prototype.appendChild = function (childNode) {
        if (childNode.rootNode !== this.rootNode) {
            childNode.rootNode = this.rootNode;
            childNode._nodeId = ++this.rootNode.nodeCounter;
        }
        childNode.parentNode = this;
        this._childNodes.push(childNode);
        return childNode;
    };
    MimeNode.prototype.replace = function (node) {
        if (node === this) {
            return this;
        }
        this.parentNode._childNodes.forEach(function (childNode, i) {
            if (childNode === this) {
                node.rootNode = this.rootNode;
                node.parentNode = this.parentNode;
                node._nodeId = this._nodeId;
                this.rootNode = this;
                this.parentNode = undefined;
                node.parentNode._childNodes[i] = node;
            }
        }.bind(this));
        return node;
    };
    MimeNode.prototype.remove = function () {
        if (!this.parentNode) {
            return this;
        }
        for (var i = this.parentNode._childNodes.length - 1; i >= 0; i--) {
            if (this.parentNode._childNodes[i] === this) {
                this.parentNode._childNodes.splice(i, 1);
                this.parentNode = undefined;
                this.rootNode = this;
                return this;
            }
        }
    };
    MimeNode.prototype.setHeader = function (key, value) {
        var added = false, headerValue;
        if (!value && key && typeof key === 'object') {
            if (key.key && key.value) {
                this.setHeader(key.key, key.value);
            } else if (Array.isArray(key)) {
                key.forEach(function (i) {
                    this.setHeader(i.key, i.value);
                }.bind(this));
            } else {
                Object.keys(key).forEach(function (i) {
                    this.setHeader(i, key[i]);
                }.bind(this));
            }
            return this;
        }
        key = this._normalizeHeaderKey(key);
        headerValue = {
            key: key,
            value: value
        };
        for (var i = 0, len = this._headers.length; i < len; i++) {
            if (this._headers[i].key === key) {
                if (!added) {
                    this._headers[i] = headerValue;
                    added = true;
                } else {
                    this._headers.splice(i, 1);
                    i--;
                    len--;
                }
            }
        }
        if (!added) {
            this._headers.push(headerValue);
        }
        return this;
    };
    MimeNode.prototype.addHeader = function (key, value) {
        if (!value && key && typeof key === 'object') {
            if (key.key && key.value) {
                this.addHeader(key.key, key.value);
            } else if (Array.isArray(key)) {
                key.forEach(function (i) {
                    this.addHeader(i.key, i.value);
                }.bind(this));
            } else {
                Object.keys(key).forEach(function (i) {
                    this.addHeader(i, key[i]);
                }.bind(this));
            }
            return this;
        }
        this._headers.push({
            key: this._normalizeHeaderKey(key),
            value: value
        });
        return this;
    };
    MimeNode.prototype.getHeader = function (key) {
        key = this._normalizeHeaderKey(key);
        for (var i = 0, len = this._headers.length; i < len; i++) {
            if (this._headers[i].key === key) {
                return this._headers[i].value;
            }
        }
    };
    MimeNode.prototype.setContent = function (content) {
        this.content = content;
        return this;
    };
    MimeNode.prototype.build = function () {
        var lines = [], contentType = (this.getHeader('Content-Type') || '').toString().toLowerCase().trim(), transferEncoding, flowed;
        if (this.content) {
            transferEncoding = (this.getHeader('Content-Transfer-Encoding') || '').toString().toLowerCase().trim();
            if (!transferEncoding || [
                    'base64',
                    'quoted-printable'
                ].indexOf(transferEncoding) < 0) {
                if (/^text\//i.test(contentType)) {
                    if (this._isPlainText(this.content)) {
                        if (/^.{77,}/m.test(this.content)) {
                            flowed = true;
                        }
                        transferEncoding = '7bit';
                    } else {
                        transferEncoding = 'quoted-printable';
                    }
                } else if (!/^multipart\//i.test(contentType)) {
                    transferEncoding = transferEncoding || 'base64';
                }
            }
            if (transferEncoding) {
                this.setHeader('Content-Transfer-Encoding', transferEncoding);
            }
        }
        if (this.filename && !this.getHeader('Content-Disposition')) {
            this.setHeader('Content-Disposition', 'attachment');
        }
        this._headers.forEach(function (header) {
            var key = header.key, value = header.value, structured;
            switch (header.key) {
            case 'Content-Disposition':
                structured = mimefuncs.parseHeaderValue(value);
                if (this.filename) {
                    structured.params.filename = this.filename;
                }
                value = this._buildHeaderValue(structured);
                break;
            case 'Content-Type':
                structured = mimefuncs.parseHeaderValue(value);
                this._handleContentType(structured);
                if (flowed) {
                    structured.params.format = 'flowed';
                }
                if (String(structured.params.format).toLowerCase().trim() === 'flowed') {
                    flowed = true;
                }
                if (structured.value.match(/^text\//) && typeof this.content === 'string' && /[\u0080-\uFFFF]/.test(this.content)) {
                    structured.params.charset = 'utf-8';
                }
                value = this._buildHeaderValue(structured);
                break;
            case 'Bcc':
                return;
            }
            value = this._encodeHeaderValue(key, value);
            if (!(value || '').toString().trim()) {
                return;
            }
            lines.push(mimefuncs.foldLines(key + ': ' + value, 76));
        }.bind(this));
        if (this.rootNode === this) {
            if (!this.getHeader('Date')) {
                lines.push('Date: ' + this.date.toUTCString().replace(/GMT/, '+0000'));
            }
            if (!this.getHeader('Message-Id')) {
                lines.push('Message-Id: <' + [
                    0,
                    0,
                    0
                ].reduce(function (prev) {
                    return prev + '-' + Math.floor((1 + Math.random()) * 4294967296).toString(16).substring(1);
                }, Date.now()) + '@' + (this.getEnvelope().from || 'localhost').split('@').pop() + '>');
            }
            if (!this.getHeader('MIME-Version')) {
                lines.push('MIME-Version: 1.0');
            }
        }
        lines.push('');
        if (this.content) {
            switch (transferEncoding) {
            case 'quoted-printable':
                lines.push(mimefuncs.quotedPrintableEncode(this.content));
                break;
            case 'base64':
                lines.push(mimefuncs.base64Encode(this.content, typeof this.content === 'object' && 'binary' || false));
                break;
            default:
                if (flowed) {
                    lines.push(mimefuncs.foldLines(this.content.replace(/\r?\n/g, '\r\n').replace(/^( |From|>)/gim, ' $1'), 76, true));
                } else {
                    lines.push(this.content.replace(/\r?\n/g, '\r\n'));
                }
            }
            if (this.multipart) {
                lines.push('');
            }
        }
        if (this.multipart) {
            this._childNodes.forEach(function (node) {
                lines.push('--' + this.boundary);
                lines.push(node.build());
            }.bind(this));
            lines.push('--' + this.boundary + '--');
            lines.push('');
        }
        return lines.join('\r\n');
    };
    MimeNode.prototype.getEnvelope = function () {
        var envelope = {
            from: false,
            to: []
        };
        this._headers.forEach(function (header) {
            var list = [];
            if (header.key === 'From' || !envelope.from && [
                    'Reply-To',
                    'Sender'
                ].indexOf(header.key) >= 0) {
                this._convertAddresses(this._parseAddresses(header.value), list);
                if (list.length && list[0]) {
                    envelope.from = list[0];
                }
            } else if ([
                    'To',
                    'Cc',
                    'Bcc'
                ].indexOf(header.key) >= 0) {
                this._convertAddresses(this._parseAddresses(header.value), envelope.to);
            }
        }.bind(this));
        return envelope;
    };
    MimeNode.prototype._parseAddresses = function (addresses) {
        return [].concat.apply([], [].concat(addresses).map(function (address) {
            if (address && address.address) {
                address = this._convertAddresses(address);
            }
            return addressparser.parse(address);
        }.bind(this)));
    };
    MimeNode.prototype._normalizeHeaderKey = function (key) {
        return (key || '').toString().replace(/\r?\n|\r/g, ' ').trim().toLowerCase().replace(/^MIME\b|^[a-z]|\-[a-z]/gi, function (c) {
            return c.toUpperCase();
        });
    };
    MimeNode.prototype._buildHeaderValue = function (structured) {
        var paramsArray = [];
        Object.keys(structured.params || {}).forEach(function (param) {
            if (param === 'filename') {
                mimefuncs.continuationEncode(param, structured.params[param], 50).forEach(function (encodedParam) {
                    paramsArray.push(encodedParam.key + '=' + encodedParam.value);
                });
            } else {
                paramsArray.push(param + '=' + this._escapeHeaderArgument(structured.params[param]));
            }
        }.bind(this));
        return structured.value + (paramsArray.length ? '; ' + paramsArray.join('; ') : '');
    };
    MimeNode.prototype._escapeHeaderArgument = function (value) {
        if (value.match(/[\s'"\\;\/=]|^\-/g)) {
            return '"' + value.replace(/(["\\])/g, '\\$1') + '"';
        } else {
            return value;
        }
    };
    MimeNode.prototype._handleContentType = function (structured) {
        this.contentType = structured.value.trim().toLowerCase();
        this.multipart = this.contentType.split('/').reduce(function (prev, value) {
            return prev === 'multipart' ? value : false;
        });
        if (this.multipart) {
            this.boundary = structured.params.boundary = structured.params.boundary || this.boundary || this._generateBoundary();
        } else {
            this.boundary = false;
        }
    };
    MimeNode.prototype._generateBoundary = function () {
        return '----sinikael-?=_' + this._nodeId + '-' + this.rootNode.baseBoundary;
    };
    MimeNode.prototype._encodeHeaderValue = function (key, value) {
        key = this._normalizeHeaderKey(key);
        switch (key) {
        case 'From':
        case 'Sender':
        case 'To':
        case 'Cc':
        case 'Bcc':
        case 'Reply-To':
            return this._convertAddresses(this._parseAddresses(value));
        case 'Message-Id':
        case 'In-Reply-To':
        case 'Content-Id':
            value = (value || '').toString().replace(/\r?\n|\r/g, ' ');
            if (value.charAt(0) !== '<') {
                value = '<' + value;
            }
            if (value.charAt(value.length - 1) !== '>') {
                value = value + '>';
            }
            return value;
        case 'References':
            value = [].concat.apply([], [].concat(value || '').map(function (elm) {
                elm = (elm || '').toString().replace(/\r?\n|\r/g, ' ').trim();
                return elm.replace(/<[^>]*>/g, function (str) {
                    return str.replace(/\s/g, '');
                }).split(/\s+/);
            })).map(function (elm) {
                if (elm.charAt(0) !== '<') {
                    elm = '<' + elm;
                }
                if (elm.charAt(elm.length - 1) !== '>') {
                    elm = elm + '>';
                }
                return elm;
            });
            return value.join(' ').trim();
        default:
            value = (value || '').toString().replace(/\r?\n|\r/g, ' ');
            return mimefuncs.mimeWordsEncode(value, 'Q', 52);
        }
    };
    MimeNode.prototype._convertAddresses = function (addresses, uniqueList) {
        var values = [];
        uniqueList = uniqueList || [];
        [].concat(addresses || []).forEach(function (address) {
            if (address.address) {
                address.address = address.address.replace(/^.*?(?=\@)/, function (user) {
                    return mimefuncs.mimeWordsEncode(user, 'Q', 52);
                }).replace(/@.+$/, function (domain) {
                    return '@' + punycode.toASCII(domain.substr(1));
                });
                if (!address.name) {
                    values.push(address.address);
                } else if (address.name) {
                    values.push(this._encodeAddressName(address.name) + ' <' + address.address + '>');
                }
                if (uniqueList.indexOf(address.address) < 0) {
                    uniqueList.push(address.address);
                }
            } else if (address.group) {
                values.push(this._encodeAddressName(address.name) + ':' + (address.group.length ? this._convertAddresses(address.group, uniqueList) : '').trim() + ';');
            }
        }.bind(this));
        return values.join(', ');
    };
    MimeNode.prototype._encodeAddressName = function (name) {
        if (!/^[\w ']*$/.test(name)) {
            if (/^[\x20-\x7e]*$/.test(name)) {
                return '"' + name.replace(/([\\"])/g, '\\$1') + '"';
            } else {
                return mimefuncs.mimeWordEncode(name, 'Q', 52);
            }
        }
        return name;
    };
    MimeNode.prototype._isPlainText = function (value) {
        if (typeof value !== 'string' || /[\x00-\x08\x0b\x0c\x0e-\x1f\u0080-\uFFFF]/.test(value)) {
            return false;
        } else {
            return true;
        }
    };
    return MimeNode;
}));