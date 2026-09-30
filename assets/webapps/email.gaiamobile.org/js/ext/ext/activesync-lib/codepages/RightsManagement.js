(function (root, factory) {
    if (typeof exports === 'object')
        module.exports = factory();
    else if (typeof define === 'function' && define.amd)
        define([], factory);
    else
        root.ASCPRightsManagement = factory();
}(this, function () {
    'use strict';
    return {
        Tags: {
            RightsManagementSupport: 6149,
            RightsManagementTemplates: 6150,
            RightsManagementTemplate: 6151,
            RightsManagementLicense: 6152,
            EditAllowed: 6153,
            ReplyAllowed: 6154,
            ReplyAllAllowed: 6155,
            ForwardAllowed: 6156,
            ModifyRecipientsAllowed: 6157,
            ExtractAllowed: 6158,
            PrintAllowed: 6159,
            ExportAllowed: 6160,
            ProgrammaticAccessAllowed: 6161,
            Owner: 6162,
            ContentExpiryDate: 6163,
            TemplateID: 6164,
            TemplateName: 6165,
            TemplateDescription: 6166,
            ContentOwner: 6167,
            RemoveRightsManagementDistribution: 6168
        }
    };
}));