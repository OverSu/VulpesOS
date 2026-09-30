(function (root, factory) {
    if (typeof exports === 'object')
        module.exports = factory(require('wbxml'), require('activesync/codepages'));
    else if (typeof define === 'function' && define.amd)
        define([
            'wbxml',
            'activesync/codepages'
        ], factory);
    else
        root.ActiveSyncProtocol = factory(WBXML, ActiveSyncCodepages);
}(this, function (WBXML, ASCP) {
    'use strict';
    var exports = {};
    var USER_AGENT = 'JavaScript ActiveSync (jsas) Client';
    function nullCallback() {
    }
    function makeError(name, parent, extraArgs) {
        function CustomError() {
            var self = this instanceof CustomError ? this : Object.create(CustomError.prototype);
            var tmp = Error();
            var offset = 1;
            self.stack = tmp.stack.substring(tmp.stack.indexOf('\n') + 1);
            self.message = arguments[0] || tmp.message;
            if (extraArgs) {
                offset += extraArgs.length;
                for (var i = 0; i < extraArgs.length; i++)
                    self[extraArgs[i]] = arguments[i + 1];
            }
            var m = /@(.+):(.+)/.exec(self.stack);
            self.fileName = arguments[offset] || m && m[1] || '';
            self.lineNumber = arguments[offset + 1] || m && m[2] || 0;
            return self;
        }
        CustomError.prototype = Object.create((parent || Error).prototype);
        CustomError.prototype.name = name;
        CustomError.prototype.constructor = CustomError;
        return CustomError;
    }
    var AutodiscoverError = makeError('ActiveSync.AutodiscoverError');
    exports.AutodiscoverError = AutodiscoverError;
    var AutodiscoverDomainError = makeError('ActiveSync.AutodiscoverDomainError', AutodiscoverError);
    exports.AutodiscoverDomainError = AutodiscoverDomainError;
    var HttpError = makeError('ActiveSync.HttpError', null, ['status']);
    exports.HttpError = HttpError;
    function nsResolver(prefix) {
        var baseUrl = 'http://schemas.microsoft.com/exchange/autodiscover/';
        var ns = {
            rq: baseUrl + 'mobilesync/requestschema/2006',
            ad: baseUrl + 'responseschema/2006',
            ms: baseUrl + 'mobilesync/responseschema/2006'
        };
        return ns[prefix] || null;
    }
    function Version(str) {
        var details = str.split('.').map(function (x) {
            return parseInt(x);
        });
        this.major = details[0], this.minor = details[1];
    }
    exports.Version = Version;
    Version.prototype = {
        eq: function (other) {
            if (!(other instanceof Version))
                other = new Version(other);
            return this.major === other.major && this.minor === other.minor;
        },
        ne: function (other) {
            return !this.eq(other);
        },
        gt: function (other) {
            if (!(other instanceof Version))
                other = new Version(other);
            return this.major > other.major || this.major === other.major && this.minor > other.minor;
        },
        gte: function (other) {
            if (!(other instanceof Version))
                other = new Version(other);
            return this.major >= other.major || this.major === other.major && this.minor >= other.minor;
        },
        lt: function (other) {
            return !this.gte(other);
        },
        lte: function (other) {
            return !this.gt(other);
        },
        toString: function () {
            return this.major + '.' + this.minor;
        }
    };
    function setAuthHeader(xhr, username, password) {
        var authorization = 'Basic ' + btoa(username + ':' + password);
        xhr.setRequestHeader('Authorization', authorization);
    }
    function autodiscover(aEmailAddress, aPassword, aTimeout, aCallback, aNoRedirect) {
        if (!aCallback)
            aCallback = nullCallback;
        var domain = aEmailAddress.substring(aEmailAddress.indexOf('@') + 1);
        do_autodiscover(domain, aEmailAddress, aPassword, aTimeout, aNoRedirect, function (aError, aConfig) {
            if (aError instanceof AutodiscoverDomainError || aError instanceof HttpError)
                do_autodiscover('autodiscover.' + domain, aEmailAddress, aPassword, aTimeout, aNoRedirect, aCallback);
            else
                aCallback(aError, aConfig);
        });
    }
    exports.autodiscover = autodiscover;
    function do_autodiscover(aHost, aEmailAddress, aPassword, aTimeout, aNoRedirect, aCallback) {
        var url = 'https://' + aHost + '/autodiscover/autodiscover.xml';
        return raw_autodiscover(url, aEmailAddress, aPassword, aTimeout, aNoRedirect, aCallback);
    }
    function raw_autodiscover(aUrl, aEmailAddress, aPassword, aTimeout, aNoRedirect, aCallback) {
        var xhr = new XMLHttpRequest({
            mozSystem: true,
            mozAnon: true
        });
        xhr.open('POST', aUrl, true);
        setAuthHeader(xhr, aEmailAddress, aPassword);
        xhr.setRequestHeader('Content-Type', 'text/xml');
        xhr.setRequestHeader('User-Agent', USER_AGENT);
        xhr.timeout = aTimeout;
        xhr.upload.onprogress = xhr.upload.onload = function () {
            xhr.timeout = 0;
        };
        xhr.onload = function () {
            if (xhr.status < 200 || xhr.status >= 300)
                return aCallback(new HttpError(xhr.statusText, xhr.status));
            var uid = Math.random();
            self.postMessage({
                uid: uid,
                type: 'configparser',
                cmd: 'accountactivesync',
                args: [
                    xhr.responseText,
                    aNoRedirect
                ]
            });
            self.addEventListener('message', function onworkerresponse(evt) {
                var data = evt.data;
                if (data.type != 'configparser' || data.cmd != 'accountactivesync' || data.uid != uid) {
                    return;
                }
                self.removeEventListener(evt.type, onworkerresponse);
                var args = data.args;
                var config = args[0], error = args[1], redirectedEmail = args[2];
                if (error) {
                    aCallback(new AutodiscoverDomainError(error), config);
                } else if (redirectedEmail) {
                    autodiscover(redirectedEmail, aPassword, aTimeout, aCallback, true);
                } else {
                    aCallback(null, config);
                }
            });
        };
        xhr.ontimeout = xhr.onerror = function () {
            aCallback(new HttpError('Error getting Autodiscover URL', null));
        };
        var postdata = '<?xml version="1.0" encoding="utf-8"?>\n' + '<Autodiscover xmlns="' + nsResolver('rq') + '">\n' + '  <Request>\n' + '    <EMailAddress>' + aEmailAddress + '</EMailAddress>\n' + '    <AcceptableResponseSchema>' + nsResolver('ms') + '</AcceptableResponseSchema>\n' + '  </Request>\n' + '</Autodiscover>';
        xhr.send(postdata);
    }
    exports.raw_autodiscover = raw_autodiscover;
    function Connection(aDeviceId, aDeviceType) {
        this._deviceId = aDeviceId || 'v140Device';
        this._deviceType = aDeviceType || 'SmartPhone';
        this.timeout = 0;
        this._connected = false;
        this._waitingForConnection = false;
        this._connectionError = null;
        this._connectionCallbacks = [];
        this.baseUrl = null;
        this._username = null;
        this._password = null;
        this.versions = [];
        this.supportedCommands = [];
        this.currentVersion = null;
        this.onmessage = null;
    }
    exports.Connection = Connection;
    Connection.prototype = {
        _notifyConnected: function (aError) {
            if (aError)
                this.disconnect();
            for (var iter in Iterator(this._connectionCallbacks)) {
                var callback = iter[1];
                callback.apply(callback, arguments);
            }
            this._connectionCallbacks = [];
        },
        get connected() {
            return this._connected;
        },
        open: function (aURL, aUsername, aPassword) {
            var servicePath = '/Microsoft-Server-ActiveSync';
            this.baseUrl = aURL;
            if (!this.baseUrl.endsWith(servicePath))
                this.baseUrl += servicePath;
            this._username = aUsername;
            this._password = aPassword;
        },
        connect: function (aCallback) {
            if (this.connected) {
                if (aCallback)
                    aCallback(null);
                return;
            }
            if (aCallback)
                this._connectionCallbacks.push(aCallback);
            if (this._waitingForConnection)
                return;
            this._waitingForConnection = true;
            this._connectionError = null;
            this.getOptions(function (aError, aOptions) {
                this._waitingForConnection = false;
                this._connectionError = aError;
                if (aError) {
                    console.error('Error connecting to ActiveSync:', aError);
                    return this._notifyConnected(aError, aOptions);
                }
                this._connected = true;
                this.versions = aOptions.versions;
                this.supportedCommands = aOptions.commands;
                this.currentVersion = new Version(aOptions.versions.slice(-1)[0]);
                return this._notifyConnected(null, aOptions);
            }.bind(this));
        },
        disconnect: function () {
            if (this._waitingForConnection)
                throw new Error('Can\'t disconnect while waiting for server response');
            this._connected = false;
            this.versions = [];
            this.supportedCommands = [];
            this.currentVersion = null;
        },
        provision: function (aCallback) {
            var pv = ASCP.Provision.Tags;
            var w = new WBXML.Writer('1.3', 1, 'UTF-8');
            w.stag(pv.Provision).etag();
            this.postCommand(w, aCallback);
        },
        getOptions: function (aCallback) {
            if (!aCallback)
                aCallback = nullCallback;
            var conn = this;
            var xhr = new XMLHttpRequest({
                mozSystem: true,
                mozAnon: true
            });
            xhr.open('OPTIONS', this.baseUrl, true);
            setAuthHeader(xhr, this._username, this._password);
            xhr.setRequestHeader('User-Agent', USER_AGENT);
            xhr.timeout = this.timeout;
            xhr.upload.onprogress = xhr.upload.onload = function () {
                xhr.timeout = 0;
            };
            xhr.onload = function () {
                if (xhr.status < 200 || xhr.status >= 300) {
                    console.error('ActiveSync options request failed with response ' + xhr.status);
                    if (conn.onmessage)
                        conn.onmessage('options', 'error', xhr, null, null, null, null);
                    aCallback(new HttpError(xhr.statusText, xhr.status));
                    return;
                }
                var result = {
                    versions: xhr.getResponseHeader('MS-ASProtocolVersions').split(/\s*,\s*/),
                    commands: xhr.getResponseHeader('MS-ASProtocolCommands').split(/\s*,\s*/)
                };
                if (conn.onmessage)
                    conn.onmessage('options', 'ok', xhr, null, null, null, result);
                aCallback(null, result);
            };
            xhr.ontimeout = xhr.onerror = function () {
                var error = new Error('Error getting OPTIONS URL');
                console.error(error);
                if (conn.onmessage)
                    conn.onmessage('options', 'timeout', xhr, null, null, null, null);
                aCallback(error);
            };
            xhr.responseType = 'text';
            xhr.send();
        },
        supportsCommand: function (aCommand) {
            if (!this.connected)
                throw new Error('Connection required to get command');
            if (typeof aCommand === 'number')
                aCommand = ASCP.__tagnames__[aCommand];
            return this.supportedCommands.indexOf(aCommand) !== -1;
        },
        doCommand: function () {
            console.warn('doCommand is deprecated. Use postCommand instead.');
            this.postCommand.apply(this, arguments);
        },
        postCommand: function (aCommand, aCallback, aExtraParams, aExtraHeaders, aProgressCallback) {
            var contentType = 'application/vnd.ms-sync.wbxml';
            if (typeof aCommand === 'string' || typeof aCommand === 'number') {
                this.postData(aCommand, contentType, null, aCallback, aExtraParams, aExtraHeaders);
            } else {
                var commandName = ASCP.__tagnames__[aCommand.rootTag];
                this.postData(commandName, contentType, aCommand.dataType === 'blob' ? aCommand.blob : aCommand.buffer, aCallback, aExtraParams, aExtraHeaders, aProgressCallback);
            }
        },
        postData: function (aCommand, aContentType, aData, aCallback, aExtraParams, aExtraHeaders, aProgressCallback) {
            if (typeof aCommand === 'number')
                aCommand = ASCP.__tagnames__[aCommand];
            if (!this.supportsCommand(aCommand)) {
                var error = new Error('This server doesn\'t support the command ' + aCommand);
                console.error(error);
                aCallback(error);
                return;
            }
            var params = [
                [
                    'Cmd',
                    aCommand
                ],
                [
                    'User',
                    this._username
                ],
                [
                    'DeviceId',
                    this._deviceId
                ],
                [
                    'DeviceType',
                    this._deviceType
                ]
            ];
            if (aExtraParams) {
                for (var iter in Iterator(params)) {
                    var param = iter[1];
                    if (param[0] in aExtraParams)
                        throw new TypeError('reserved URL parameter found');
                }
                for (var kv in Iterator(aExtraParams))
                    params.push(kv);
            }
            var paramsStr = params.map(function (i) {
                return encodeURIComponent(i[0]) + '=' + encodeURIComponent(i[1]);
            }).join('&');
            var xhr = new XMLHttpRequest({
                mozSystem: true,
                mozAnon: true
            });
            xhr.open('POST', this.baseUrl + '?' + paramsStr, true);
            setAuthHeader(xhr, this._username, this._password);
            xhr.setRequestHeader('MS-ASProtocolVersion', this.currentVersion);
            xhr.setRequestHeader('Content-Type', aContentType);
            xhr.setRequestHeader('User-Agent', USER_AGENT);
            if (aExtraHeaders) {
                for (var iter in Iterator(aExtraHeaders)) {
                    var key = iter[0], key = iter[1];
                    xhr.setRequestHeader(key, value);
                }
            }
            xhr.timeout = this.timeout;
            xhr.upload.onprogress = xhr.upload.onload = function () {
                xhr.timeout = 0;
            };
            xhr.onprogress = function (event) {
                if (aProgressCallback)
                    aProgressCallback(event.loaded, event.total);
            };
            var conn = this;
            var parentArgs = arguments;
            xhr.onload = function () {
                if (xhr.status === 451) {
                    conn.baseUrl = xhr.getResponseHeader('X-MS-Location');
                    if (conn.onmessage)
                        conn.onmessage(aCommand, 'redirect', xhr, params, aExtraHeaders, aData, null);
                    conn.postData.apply(conn, parentArgs);
                    return;
                }
                if (xhr.status < 200 || xhr.status >= 300) {
                    console.error('ActiveSync command ' + aCommand + ' failed with ' + 'response ' + xhr.status);
                    if (conn.onmessage)
                        conn.onmessage(aCommand, 'error', xhr, params, aExtraHeaders, aData, null);
                    aCallback(new HttpError(xhr.statusText, xhr.status));
                    return;
                }
                var response = null;
                if (xhr.response.byteLength > 0)
                    response = new WBXML.Reader(new Uint8Array(xhr.response), ASCP);
                if (conn.onmessage)
                    conn.onmessage(aCommand, 'ok', xhr, params, aExtraHeaders, aData, response);
                aCallback(null, response);
            };
            xhr.ontimeout = xhr.onerror = function (evt) {
                var error = new Error('Command URL ' + evt.type + ' for command ' + aCommand + ' at baseUrl ' + this.baseUrl);
                console.error(error);
                if (conn.onmessage)
                    conn.onmessage(aCommand, evt.type, xhr, params, aExtraHeaders, aData, null);
                aCallback(error);
            }.bind(this);
            xhr.responseType = 'arraybuffer';
            xhr.send(aData);
        }
    };
    return exports;
}));