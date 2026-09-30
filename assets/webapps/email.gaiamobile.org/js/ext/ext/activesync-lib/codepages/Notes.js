(function (root, factory) {
    if (typeof exports === 'object')
        module.exports = factory();
    else if (typeof define === 'function' && define.amd)
        define([], factory);
    else
        root.ASCPNotes = factory();
}(this, function () {
    'use strict';
    return {
        Tags: {
            Subject: 5893,
            MessageClass: 5894,
            LastModifiedDate: 5895,
            Categories: 5896,
            Category: 5897
        }
    };
}));