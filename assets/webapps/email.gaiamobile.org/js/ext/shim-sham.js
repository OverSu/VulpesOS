(function () {
    function setZeroTimeout(fn) {
        setTimeout(fn);
    }
    window.setZeroTimeout = setZeroTimeout;
    window.process = {
        immediate: false,
        nextTick: function (cb) {
            if (this.immediate)
                cb();
            else
                window.setZeroTimeout(cb);
        }
    };
}());