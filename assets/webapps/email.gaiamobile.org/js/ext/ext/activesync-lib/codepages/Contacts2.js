(function (root, factory) {
    if (typeof exports === 'object')
        module.exports = factory();
    else if (typeof define === 'function' && define.amd)
        define([], factory);
    else
        root.ASCPContacts2 = factory();
}(this, function () {
    'use strict';
    return {
        Tags: {
            CustomerId: 3077,
            GovernmentId: 3078,
            IMAddress: 3079,
            IMAddress2: 3080,
            IMAddress3: 3081,
            ManagerName: 3082,
            CompanyMainPhone: 3083,
            AccountName: 3084,
            NickName: 3085,
            MMS: 3086
        }
    };
}));