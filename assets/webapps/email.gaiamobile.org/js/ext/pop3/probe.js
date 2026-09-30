define([
    './pop3',
    '../syncbase',
    'logic',
    '../errorutils',
    'exports'
], function (pop3, syncbase, logic, errorutils, exports) {
    var scope = logic.scope('Pop3Prober');
    exports.probeAccount = function (credentials, connInfo) {
        var opts = {
            host: connInfo.hostname,
            port: connInfo.port,
            crypto: connInfo.crypto,
            username: credentials.username,
            password: credentials.password,
            connTimeout: syncbase.CONNECT_TIMEOUT_MS
        };
        logic(scope, 'connecting', { connInfo: connInfo });
        var resolve, reject;
        var promise = new Promise(function (_resolve, _reject) {
            resolve = _resolve;
            reject = _reject;
        });
        var conn = new pop3.Pop3Client(opts, function (err) {
            if (err) {
                reject(err);
                return;
            }
            conn.protocol.sendRequest('UIDL', ['1'], false, function (err, rsp) {
                if (rsp) {
                    conn.protocol.sendRequest('TOP', [
                        '1',
                        '0'
                    ], true, function (err, rsp) {
                        if (rsp) {
                            resolve(conn);
                        } else if (err.err) {
                            logic(scope, 'server-not-great', { why: 'no TOP' });
                            reject('pop-server-not-great');
                        } else {
                            reject(rsp.err);
                        }
                    });
                } else {
                    conn.protocol.sendRequest('UIDL', [], true, function (err, rsp) {
                        if (rsp) {
                            resolve(conn);
                        } else if (err.err) {
                            logic(scope, 'server-not-great', { why: 'no UIDL' });
                            reject('pop-server-not-great');
                        } else {
                            reject(rsp.err);
                        }
                    });
                }
            });
        });
        return promise.then(function (conn) {
            logic(scope, 'success');
            return {
                conn: conn,
                timezoneOffset: null
            };
        }).catch(function (err) {
            err = normalizePop3Error(err);
            logic(scope, 'error', { error: err });
            if (conn) {
                conn.close();
            }
            return Promise.reject(err);
        });
    };
    var GMAIL_POP_DISABLED_RE = /\[SYS\/PERM\] Your account is not enabled for POP/;
    var GMAIL_DOMAIN_DISABLED_RE = /\[SYS\/PERM\] POP access is disabled for your domain\./;
    function analyzePop3LibraryError(err) {
        if (!err || !err.name) {
            return null;
        }
        if (err.name === 'bad-user-or-pass' && err.message && GMAIL_POP_DISABLED_RE.test(err.message)) {
            return 'pop3-disabled';
        } else if (err.name === 'bad-user-or-pass' && err.message && GMAIL_DOMAIN_DISABLED_RE.test(err.message)) {
            return 'pop3-disabled';
        } else if (err.name === 'unresponsive-server' && err.exception && err.exception.name && /security/i.test(err.exception.name)) {
            return 'bad-security';
        } else if ((err.name === 'unresponsive-server' || err.name === 'bad-user-or-pass') && err.message && /\[(LOGIN-DELAY|SYS|IN-USE)/i.test(err.message)) {
            return 'server-maintenance';
        } else {
            return err.name;
        }
    }
    var normalizePop3Error = exports.normalizePop3Error = function (err) {
        var reportAs = analyzePop3LibraryError(err) || errorutils.analyzeException(err) || 'unknown';
        logic(scope, 'normalized-error', {
            error: err,
            reportAs: reportAs
        });
        return reportAs;
    };
});