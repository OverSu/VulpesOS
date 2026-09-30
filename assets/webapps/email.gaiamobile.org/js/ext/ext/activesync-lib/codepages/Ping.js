(function (root, factory) {
    if (typeof exports === 'object')
        module.exports = factory();
    else if (typeof define === 'function' && define.amd)
        define([], factory);
    else
        root.ASCPPing = factory();
}(this, function () {
    'use strict';
    return {
        Tags: {
            Ping: 3333,
            AutdState: 3334,
            Status: 3335,
            HeartbeatInterval: 3336,
            Folders: 3337,
            Folder: 3338,
            Id: 3339,
            Class: 3340,
            MaxFolders: 3341
        },
        Enums: {
            Status: {
                Expired: '1',
                Changed: '2',
                MissingParameters: '3',
                SyntaxError: '4',
                InvalidInterval: '5',
                TooManyFolders: '6',
                SyncFolders: '7',
                ServerError: '8'
            }
        }
    };
}));