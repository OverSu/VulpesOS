(function (root, factory) {
    if (typeof exports === 'object')
        module.exports = factory();
    else if (typeof define === 'function' && define.amd)
        define([], factory);
    else
        root.ASCPDocumentLibrary = factory();
}(this, function () {
    'use strict';
    return {
        Tags: {
            LinkId: 4869,
            DisplayName: 4870,
            IsFolder: 4871,
            CreationDate: 4872,
            LastModifiedDate: 4873,
            IsHidden: 4874,
            ContentLength: 4875,
            ContentType: 4876
        }
    };
}));