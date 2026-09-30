(function (root, factory) {
    if (typeof exports === 'object')
        module.exports = factory();
    else if (typeof define === 'function' && define.amd)
        define([], factory);
    else
        root.ASCPItemEstimate = factory();
}(this, function () {
    'use strict';
    return {
        Tags: {
            GetItemEstimate: 1541,
            Version: 1542,
            Collections: 1543,
            Collection: 1544,
            Class: 1545,
            CollectionId: 1546,
            DateTime: 1547,
            Estimate: 1548,
            Response: 1549,
            Status: 1550
        },
        Enums: {
            Status: {
                Success: '1',
                InvalidCollection: '2',
                NoSyncState: '3',
                InvalidSyncKey: '4'
            }
        }
    };
}));