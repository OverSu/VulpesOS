var jsdom = require('jsdom');
module.exports = require('./lib/bleach.js');
module.exports.documentConstructor = jsdom.jsdom;
module.exports._preCleanNodeHack = function (node, html) {
    if (node.innerHTML === '' && html.match(/<!--/)) {
        node.innerHTML = html + '-->';
    }
};