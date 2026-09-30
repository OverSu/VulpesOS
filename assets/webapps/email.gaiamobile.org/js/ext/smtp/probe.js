define([
    'logic',
    './client',
    'exports'
], function (logic, client, exports) {
    var scope = logic.scope('SmtpProber');
    exports.probeAccount = function (credentials, connInfo) {
        logic(scope, 'connecting', {
            _credentials: credentials,
            connInfo: connInfo
        });
        var conn;
        return client.createSmtpConnection(credentials, connInfo, function onCredentialsUpdated() {
            logic(scope, 'credentials-updated');
        }).then(function (newConn) {
            conn = newConn;
            return verifyAddress(conn, connInfo.emailAddress);
        }).then(function () {
            logic(scope, 'success');
            conn.close();
            return conn;
        }).catch(function (err) {
            var errorString = client.analyzeSmtpError(conn, err, false);
            if (conn) {
                conn.close();
            }
            logic(scope, 'error', {
                error: errorString,
                connInfo: connInfo
            });
            throw errorString;
        });
    };
    function verifyAddress(conn, emailAddress) {
        logic(scope, 'checking-address-validity', {
            ns: 'SmtpProber',
            _address: emailAddress
        });
        return new Promise(function (resolve, reject) {
            conn.useEnvelope({
                from: emailAddress,
                to: [emailAddress]
            });
            conn.onready = function () {
                resolve();
            };
            conn.onerror = function (err) {
                reject(err);
            };
        });
    }
});