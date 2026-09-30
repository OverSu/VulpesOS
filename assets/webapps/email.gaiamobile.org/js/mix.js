define([], function () {
    return function mix(target, source, override) {
        Object.keys(source).forEach(function (key) {
            if (!target.hasOwnProperty(key) || override) {
                target[key] = source[key];
            }
        });
        return target;
    };
});