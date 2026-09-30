define({
    load: function (id, require, onload, config) {
        if (config.isBuild) {
            return onload();
        }
        var style = document.createElement('link');
        style.type = 'text/css';
        style.rel = 'stylesheet';
        style.href = require.toUrl(id + '.css');
        style.addEventListener('load', onload, false);
        document.head.appendChild(style);
    }
});