define([
    'require',
    'exports',
    'module',
    'cropResizeRotate'
], function (require, exports, module) {
    'use strict';
    var cropResizeRotate = require('cropResizeRotate');
    module.exports = function (imageBlob, metadata, thumbnailSize, done) {
        cropResizeRotate(imageBlob, null, thumbnailSize, null, metadata, function (error, resizedBlob) {
            if (error) {
                console.error('Error while resizing image: ' + error);
                done(imageBlob);
                return;
            }
            done(resizedBlob);
        });
    };
});