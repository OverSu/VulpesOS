/* global LazyLoader */
'use strict';

(function(exports) {

 /**
   * SystemBanner displays a type of notification to the user in certain cases.
   * It is a type of temporary notification that does not live in the
   * notifications tray. Examples of the SystemBanner implementation include
   * application installation, crash reporter, and low storage notices.
   * @class SystemBanner
   */
  function SystemBanner() {
    this._generation = 0;
  }

  /**
   * Amount of time before banner is automatically dismissed.
   */
  SystemBanner.TIMEOUT = 4000;

  SystemBanner.prototype = {

    /**
     * A reference to the SystemBanner element
     * @memberof SystemBanner.prototype
     * @type {Element}
     */
    _banner: null,

    /**
     * Set when the clicked callback called. Bypasses dismiss.
     * @memberof SystemBanner.prototype
     * @type {Boolean}
     */
    _clicked: false,

    /**
     * Set to true when the banner is currently showing to the user.
     * @memberof SystemBanner.prototype
     * @type {Boolean}
     */
    _showing: false,

    /**
     * Generates and returns the banner if it does not exist
     * @memberof SystemBanner.prototype
     * @type {Function}
     */
    getBanner: function() {
      if (this._banner) {
        return Promise.resolve(this._banner);
      }

      return LazyLoader.load('shared/elements/gaia-component/gaia-component.js')
        .then(() => {
          return LazyLoader.load('shared/elements/gaia-toast/gaia-toast.js');
        })
        .then(() => {
          this._banner = document.createElement('gaia-toast');
          this._banner.timeout = SystemBanner.TIMEOUT;
          this._banner.className = 'banner';
          this._banner.dataset.zIndexLevel = 'system-notification-banner';
          var container = createChild(this._banner, 'div', 'container');
          createChild(container, 'div', 'messages');
          createChild(container, 'div', 'buttons');
          return this._banner;
        });
    },

    /**
     * Shows a banner with a given message.
     * Optionally shows a button with a given label/callback/dismiss.
     * 'dismiss' is called when the banner is dismissed and button
     * has not been clicked. It is optional.
     * @memberof SystemBanner.prototype
     * @param {String|Array} messages The messages to display
     * @param {Object} buttonParams
     *   { label: l10nAttrs, callback: ..., dismiss: ... }
     */
    show: function(messages, buttonParams) {
      var generation = ++this._generation;
      clearTimeout(this._dismissTimer);
      if (this._cancelRemoval) {
        this._cancelRemoval();
      }
      this._clicked = false;
      this._showing = true;

      return this.getBanner().then(banner => {
        if (generation !== this._generation || !this._showing) {
          return;
        }
        // Clear the button and message containers.
        var messageContainer = banner.querySelector('.messages');
        var buttonContainer = banner.querySelector('.buttons');
        messageContainer.innerHTML = '';
        buttonContainer.innerHTML = '';

        // Populate banner with messages.
        if (!Array.isArray(messages)) {
          messages = [messages];
        }
        messages.forEach((chunk) => {
          var p = createChild(messageContainer, 'p');
          setElementL10n(p, chunk);
        });

        // Populate  buttons if specified.
        if (buttonParams) {
          var button = createChild(buttonContainer, 'span');
          button.className = 'button';
          setElementL10n(button, buttonParams.label);
          button.addEventListener('click', () => {
            this._clicked = true;
            this.hide();
            buttonParams.callback && buttonParams.callback();
          });
        }

        // Hide banner and invoke button dismiss() on click or timeout.
        var hideBanner = () => {
          if (generation !== this._generation || !this._showing) {
            return;
          }
          this.hide();
          if (!this._clicked) {
            buttonParams && buttonParams.dismiss && buttonParams.dismiss();
          }
        };
        banner.onclick = hideBanner;
        this._dismissTimer = setTimeout(hideBanner, SystemBanner.TIMEOUT);

        document.getElementById('screen').appendChild(banner);
        banner.show();
      });
    },

    /**
     * Hide the System Banner and remove it from the DOM.
     */
    hide: function() {
      if (!this._showing) {
        return;
      }
      this._showing = false;
      clearTimeout(this._dismissTimer);
      var generation = this._generation;

      return this.getBanner().then(banner => {
        if (generation !== this._generation || this._showing) {
          return;
        }
        // Animation events inside a modern shadow root do not reach the host.
        var animation = banner.shadowRoot &&
          banner.shadowRoot.querySelector('.bread') || banner;
        var cleanup = () => {
          clearTimeout(this._removeTimer);
          animation.removeEventListener('animationend', removeBanner);
          animation.removeEventListener('animationcancel', removeBanner);
          this._cancelRemoval = null;
        };
        var removeBanner = event => {
          if (event && event.target !== animation) {
            return;
          }
          cleanup();
          if (!this._showing && generation === this._generation) {
            banner.parentNode && banner.parentNode.removeChild(banner);
          }
        };
        this._cancelRemoval = cleanup;
        animation.addEventListener('animationend', removeBanner);
        animation.addEventListener('animationcancel', removeBanner);
        // Gaia's exit animation lasts 600 ms. Also dismiss if it is disabled
        // or no animation event is produced.
        this._removeTimer = setTimeout(removeBanner, 700);
        banner.hide();
      });
    }
  };

  function createChild(parentEl, type, className) {
    var el = document.createElement(type);
    if (className) {
      el.className = className;
    }
    parentEl.appendChild(el);
    return el;
  }

  function setElementL10n(element, l10nAttrs) {
    if (typeof(l10nAttrs) === 'string') {
      element.setAttribute('data-l10n-id', l10nAttrs);
    } else {
      navigator.mozL10n.setAttributes(
        element, l10nAttrs.id, l10nAttrs.args);
    }
  }

  exports.SystemBanner = SystemBanner;

}(window));
