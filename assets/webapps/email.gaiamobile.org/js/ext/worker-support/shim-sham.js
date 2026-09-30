(function () {
    function setZeroTimeout(fn) {
        setTimeout(fn);
    }
    window.setZeroTimeout = setZeroTimeout;
}());