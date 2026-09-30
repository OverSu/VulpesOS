(function (root, factory) {
    if (typeof exports === 'object')
        module.exports = factory();
    else if (typeof define === 'function' && define.amd)
        define([], factory);
    else
        root.ASCPMeetingResponse = factory();
}(this, function () {
    'use strict';
    return {
        Tags: {
            CalendarId: 2053,
            CollectionId: 2054,
            MeetingResponse: 2055,
            RequestId: 2056,
            Request: 2057,
            Result: 2058,
            Status: 2059,
            UserResponse: 2060,
            InstanceId: 2062
        },
        Enums: {
            Status: {
                Success: '1',
                InvalidRequest: '2',
                MailboxError: '3',
                ServerError: '4'
            },
            UserResponse: {
                Accepted: '1',
                Tentative: '2',
                Declined: '3'
            }
        }
    };
}));