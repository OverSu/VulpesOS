define([
    'require',
    'query_string',
    'services',
    'cards'
], function (require) {
    var queryString = require('query_string');
    var services = require('services');
    var cards = require('cards');
    var oauthSecrets = services.oauth2;
    var curOauthSecrets;
    var redeemingCode = false;
    var TIMEOUT_MS = 30 * 1000;
    var redirectUri = 'http://localhost';
    var deferred, p, oauthSettings;
    function onBrowserComplete(message) {
        var data = message.data;
        if (message.type === 'oauth2Complete') {
            if (!data.code) {
                reset('reject', new Error('no code returned'));
                return;
            }
            console.log('oauth redirect returned with code');
            redeemingCode = true;
            redeemCode(data.code).then(function (redeemed) {
                var expiresInMS = parseInt(redeemed.expires_in, 10) * 1000;
                var expireTimeMS = Date.now() + Math.max(0, expiresInMS - TIMEOUT_MS);
                var result = {
                    status: 'success',
                    tokens: {
                        accessToken: redeemed.access_token,
                        refreshToken: redeemed.refresh_token,
                        expireTimeMS: expireTimeMS
                    },
                    secrets: curOauthSecrets
                };
                reset('resolve', result);
            }, function (err) {
                reset('reject', err);
            });
        } else {
            reset('resolve', { status: 'cancel' });
        }
    }
    function redeemCode(code) {
        console.log('redeeming oauth code');
        return new Promise(function (xhrResolve, xhrReject) {
            var xhr = new XMLHttpRequest({ mozSystem: true });
            xhr.open('POST', oauthSettings.tokenEndpoint, true);
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            xhr.timeout = TIMEOUT_MS;
            xhr.onload = function () {
                if (xhr.status < 200 || xhr.status >= 300) {
                    console.error('token redemption failed', xhr.status, xhr.responseText);
                    xhrReject('status' + xhr.status);
                } else {
                    try {
                        var data = JSON.parse(xhr.responseText);
                        console.log('oauth code redeemed. access_token? ' + !!data.access_token + ', refresh_token? ' + !!data.refresh_token);
                        xhrResolve(data);
                    } catch (ex) {
                        console.error('badly formed JSON response for token redemption:', xhr.responseText);
                        xhrReject(ex);
                    }
                }
            };
            xhr.onerror = function (err) {
                console.error('token redemption weird error:', err);
                xhrReject(err);
            };
            xhr.ontimeout = function () {
                console.error('token redemption timeout');
                xhrReject('timeout');
            };
            var redemptionArgs = {
                code: code,
                client_id: curOauthSecrets.clientId,
                client_secret: curOauthSecrets.clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            };
            xhr.send(queryString.fromObject(redemptionArgs));
        });
    }
    function reset(actionName, value) {
        console.log('oauth2 fetch reset with action: ' + actionName);
        var action = deferred[actionName];
        deferred = p = null;
        redeemingCode = false;
        action(value);
    }
    return function oauth2Fetch(o2Settings, extraQueryObject) {
        if (deferred) {
            reset('reject', new Error('Multiple oauth calls, starting new one'));
        }
        p = new Promise(function (res, rej) {
            deferred = {
                resolve: res,
                reject: rej
            };
        });
        oauthSettings = o2Settings;
        curOauthSecrets = undefined;
        if (o2Settings.clientId && o2Settings.clientSecret) {
            curOauthSecrets = {
                clientId: o2Settings.clientId,
                clientSecret: o2Settings.clientSecret
            };
        } else if (o2Settings.secretGroup) {
            curOauthSecrets = oauthSecrets[o2Settings.secretGroup];
        }
        if (!curOauthSecrets) {
            reset('reject', new Error('no secrets for group: ' + o2Settings.secretGroup));
            return p;
        }
        var authEndpointQuery = {
            client_id: curOauthSecrets.clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: o2Settings.scope,
            max_auth_age: 0
        };
        var url = o2Settings.authEndpoint + '?' + queryString.fromObject(authEndpointQuery);
        if (extraQueryObject) {
            var extraArgs = queryString.fromObject(extraQueryObject);
            if (extraArgs) {
                url += '&' + extraArgs;
            }
        }
        cards.pushCard('setup_oauth2', 'animate', {
            url: url,
            onBrowserComplete: onBrowserComplete
        });
        return p;
    };
});