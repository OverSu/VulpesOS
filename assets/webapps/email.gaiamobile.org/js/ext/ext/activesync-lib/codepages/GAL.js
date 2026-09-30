(function (root, factory) {
    if (typeof exports === 'object')
        module.exports = factory();
    else if (typeof define === 'function' && define.amd)
        define([], factory);
    else
        root.ASCPGAL = factory();
}(this, function () {
    'use strict';
    return {
        Tags: {
            DisplayName: 4101,
            Phone: 4102,
            Office: 4103,
            Title: 4104,
            Company: 4105,
            Alias: 4106,
            FirstName: 4107,
            LastName: 4108,
            HomePhone: 4109,
            MobilePhone: 4110,
            EmailAddress: 4111,
            Picture: 4112,
            Status: 4113,
            Data: 4114
        }
    };
}));