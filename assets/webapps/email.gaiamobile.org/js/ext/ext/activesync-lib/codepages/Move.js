(function (root, factory) {
    if (typeof exports === 'object')
        module.exports = factory();
    else if (typeof define === 'function' && define.amd)
        define([], factory);
    else
        root.ASCPMove = factory();
}(this, function () {
    'use strict';
    return {
        Tags: {
            MoveItems: 1285,
            Move: 1286,
            SrcMsgId: 1287,
            SrcFldId: 1288,
            DstFldId: 1289,
            Response: 1290,
            Status: 1291,
            DstMsgId: 1292
        },
        Enums: {
            Status: {
                InvalidSourceID: '1',
                InvalidDestID: '2',
                Success: '3',
                SourceIsDest: '4',
                MoveFailure: '5',
                ItemLocked: '7'
            }
        }
    };
}));