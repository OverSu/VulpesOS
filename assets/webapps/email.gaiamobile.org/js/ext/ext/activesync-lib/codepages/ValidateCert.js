(function (root, factory) {
    if (typeof exports === 'object')
        module.exports = factory();
    else if (typeof define === 'function' && define.amd)
        define([], factory);
    else
        root.ASCPValidateCert = factory();
}(this, function () {
    'use strict';
    return {
        Tags: {
            ValidateCert: 2821,
            Certificates: 2822,
            Certificate: 2823,
            CertificateChain: 2824,
            CheckCRL: 2825,
            Status: 2826
        },
        Enums: {
            Status: {
                Success: '1',
                ProtocolError: '2',
                InvalidSignature: '3',
                UntrustedSource: '4',
                InvalidChain: '5',
                NotForEmail: '6',
                Expired: '7',
                InconsistentTimes: '8',
                IdMisused: '9',
                MissingInformation: '10',
                CAEndMismatch: '11',
                EmailAddressMismatch: '12',
                Revoked: '13',
                ServerOffline: '14',
                ChainRevoked: '15',
                RevocationUnknown: '16',
                UnknownError: '17'
            }
        }
    };
}));