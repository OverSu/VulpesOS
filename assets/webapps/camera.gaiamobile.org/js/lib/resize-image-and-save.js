define([
    'require',
    'exports',
    'module',
    'lib/storage',
    'cropResizeRotate'
], function (require, exports, module) {
    'use strict';
    var Storage = require('lib/storage');
    var cropResizeRotate = require('cropResizeRotate');
    module.exports = function (options, done) {
        var blob = options.blob;
        var outputSize = options.width && options.height ? {
            width: options.width,
            height: options.height
        } : options.size || null;
        cropResizeRotate(blob, null, outputSize, 'image/jpeg+exif', function (error, resizedBlob) {
            if (error) {
                console.error('Error while resizing image: ' + error);
                done(blob);
                return;
            }
            if (resizedBlob === blob) {
                done(blob);
                return;
            }
            var storage = new Storage();
            storage.deletePicture(blob.name, addPicture);
            function addPicture(error) {
                if (error) {
                    done(blob);
                    return;
                }
                storage.addPicture(resizedBlob, { filepath: blob.name }, onSavedPicture);
            }
            function onSavedPicture(error, filepath, absolutePath, fileBlob) {
                done(fileBlob);
            }
        });
    };
});