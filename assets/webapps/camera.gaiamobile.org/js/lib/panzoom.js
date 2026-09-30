define([
    'require',
    'exports',
    'module',
    'GestureDetector'
], function (require, exports, module) {
    'use strict';
    var GestureDetector = require('GestureDetector');
    module.exports = addPanAndZoomHandlers;
    function addPanAndZoomHandlers(frame, swipeCallback) {
        var container = frame.container;
        var gestureDetector = new GestureDetector(container);
        gestureDetector.startDetecting();
        var swipeAmount = 0;
        container.addEventListener('dbltap', handleDoubleTap);
        container.addEventListener('transform', handleTransform);
        container.addEventListener('pan', handlePan);
        if (swipeCallback) {
            container.addEventListener('swipe', handleSwipe);
        }
        function handleDoubleTap(e) {
            var scale;
            if (frame.fit.scale > frame.fit.baseScale) {
                scale = frame.fit.baseScale / frame.fit.scale;
            } else {
                scale = 2;
            }
            frame.zoom(scale, e.detail.clientX, e.detail.clientY, 200);
        }
        function handleTransform(e) {
            frame.zoom(e.detail.relative.scale, e.detail.midpoint.clientX, e.detail.midpoint.clientY);
        }
        function handlePan(e) {
            var dx = e.detail.relative.dx;
            var dy = e.detail.relative.dy;
            if (swipeCallback) {
                dx += swipeAmount;
                swipeAmount = frame.pan(dx, dy);
                swipeCallback(swipeAmount);
            } else {
                frame.pan(dx, dy);
            }
        }
        function handleSwipe(e) {
            if (swipeAmount !== 0) {
                swipeCallback(swipeAmount, e.detail.vx);
                swipeAmount = 0;
            }
        }
    }
});