define([
    'require',
    'app_self',
    'cards',
    './base_card',
    'template!./setup_oauth2.html'
], function (require) {
    var appSelf = require('app_self'), cards = require('cards');
    return [
        require('./base_card')(require('template!./setup_oauth2.html')),
        {
            onArgs: function (args) {
                this.onBrowserComplete = args.onBrowserComplete;
                var browserFrame = document.createElement('iframe');
                browserFrame.classList.add('sup-oauth2-browser');
                browserFrame.setAttribute('mozbrowser', true);
                browserFrame.setAttribute('src', args.url);
                browserFrame.addEventListener('mozbrowserlocationchange', this.onLocationChange.bind(this));
                this.scrollRegion.appendChild(browserFrame);
            },
            die: function () {
                appSelf.latest('self', function (app) {
                    console.log('clearing browser data: ' + app);
                    if (app) {
                        app.clearBrowserData();
                    }
                    console.log('browser data cleared');
                });
            },
            close: function () {
                cards.removeCardAndSuccessors(this, 'animate', 1);
            },
            onBack: function (event) {
                if (event) {
                    event.stopPropagation();
                    event.preventDefault();
                }
                this.onBrowserComplete({ type: 'oauth2Cancel' });
                this.close();
            },
            onLocationChange: function (event) {
                var url = event.detail;
                if (url.indexOf('app:') !== 0 || url.indexOf('cards/oauth2/redirect.html?') === -1) {
                    this.headerLabel.textContent = url;
                    return;
                }
                this.close();
                var search = url.split('?')[1] || '';
                var result = {
                    type: 'oauth2Complete',
                    data: {}
                };
                var elements = search.split('&');
                elements.forEach(function (p) {
                    var values = p.split('=');
                    result.data[decodeURIComponent(values[0])] = decodeURIComponent(values[1]);
                });
                this.onBrowserComplete(result);
            }
        }
    ];
});