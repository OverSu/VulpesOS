(function (root, factory) {
    if (typeof exports === 'object')
        module.exports = factory();
    else if (typeof define === 'function' && define.amd)
        define([], factory);
    else
        root.ASCPAirSyncBase = factory();
}(this, function () {
    'use strict';
    return {
        Tags: {
            BodyPreference: 4357,
            Type: 4358,
            TruncationSize: 4359,
            AllOrNone: 4360,
            Reserved: 4361,
            Body: 4362,
            Data: 4363,
            EstimatedDataSize: 4364,
            Truncated: 4365,
            Attachments: 4366,
            Attachment: 4367,
            DisplayName: 4368,
            FileReference: 4369,
            Method: 4370,
            ContentId: 4371,
            ContentLocation: 4372,
            IsInline: 4373,
            NativeBodyType: 4374,
            ContentType: 4375,
            Preview: 4376,
            BodyPartPreference: 4377,
            BodyPart: 4378,
            Status: 4379
        },
        Enums: {
            Type: {
                PlainText: '1',
                HTML: '2',
                RTF: '3',
                MIME: '4'
            },
            Method: {
                Normal: '1',
                EmbeddedMessage: '5',
                AttachOLE: '6'
            },
            NativeBodyType: {
                PlainText: '1',
                HTML: '2',
                RTF: '3'
            },
            Status: { Success: '1' }
        }
    };
}));