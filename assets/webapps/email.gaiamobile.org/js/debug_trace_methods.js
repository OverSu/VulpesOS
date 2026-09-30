define([], function () {
    return function debugTraceMethods(obj, moduleId, perfLogThreshold) {
        perfLogThreshold = perfLogThreshold || 0;
        var logQueue = [], logTimeoutId = 0;
        function logPerf() {
            logQueue.forEach(function (msg) {
                console.log(msg);
            });
            logQueue = [];
            logTimeoutId = 0;
        }
        function queueLog(prop, time, arg0) {
            var arg0Type = typeof arg0;
            logQueue.push(moduleId + ': ' + prop + (arg0Type === 'number' || arg0Type === 'boolean' || arg0Type === 'string' ? ': (' + arg0 + ')' : '') + (perfLogThreshold === 0 ? '' : ': ' + time));
            if (perfLogThreshold === 0) {
                logPerf();
            } else {
                if (!logTimeoutId) {
                    logTimeoutId = setTimeout(logPerf, 2000);
                }
            }
        }
        function perfWrap(prop, fn) {
            return function () {
                var start = performance.now();
                if (perfLogThreshold === 0) {
                    queueLog(prop, 0, arguments[0]);
                }
                var result = fn.apply(this, arguments);
                var end = performance.now();
                var time = end - start;
                if (perfLogThreshold > 0 && time > perfLogThreshold) {
                    queueLog(prop, end - start, arguments[0]);
                }
                return result;
            };
        }
        if (perfLogThreshold > -1) {
            Object.keys(obj).forEach(function (prop) {
                var proto = obj;
                if (typeof proto[prop] === 'function') {
                    proto[prop] = perfWrap(prop, proto[prop]);
                }
            });
        }
    };
});