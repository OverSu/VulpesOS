define([
    'require',
    'exports',
    'module',
    'jpegMetaDataParser'
], function (require, exports, module) {
    'use strict';
    var parseJpegMetadata = require('jpegMetaDataParser');
    module.exports = function (blob, done) {
        parseJpegMetadata(blob, onJpegParsed);
        function onJpegParsed(metadata) {
            metadata.blob = blob;
            if (!metadata.preview) {
                done(metadata);
                return;
            }
            var start = metadata.preview.start;
            var end = metadata.preview.end;
            var previewBlob = blob.slice(start, end, 'image/jpeg');
            parseJpegMetadata(previewBlob, onSuccess, onError);
            function onSuccess(previewMetadata) {
                metadata.preview.width = previewMetadata.width;
                metadata.preview.height = previewMetadata.height;
                done(metadata);
            }
            function onError() {
                done(metadata);
            }
        }
    };
});