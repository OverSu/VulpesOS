define([
    'browserbox',
    'logic',
    './client',
    '../syncbase',
    'exports'
], function (BrowserBox, logic, imapclient, syncbase, exports) {
    exports.probeAccount = function (credentials, connInfo) {
        var scope = logic.scope('ImapProber');
        logic(scope, 'connecting', { connInfo: connInfo });
        var conn;
        return imapclient.createImapConnection(credentials, connInfo, function onCredentialsUpdated() {
            logic(scope, 'credentials-updated');
        }).then(function (newConn) {
            conn = newConn;
            logic(scope, 'success');
            return { conn: conn };
        }).catch(function (err) {
            err = imapclient.normalizeImapError(conn, err);
            logic(scope, 'error', { error: err });
            if (conn) {
                conn.close();
            }
            throw err;
        });
    };
});