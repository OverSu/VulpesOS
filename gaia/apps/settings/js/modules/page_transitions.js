/**
 * PageTransitions provides transition functions used when navigating panels.
 *
 * @module PageTransitions
 */
define(function() {
  'use strict';

  var _sendPanelReady = function _send_panel_ready(oldPanelHash, newPanelHash) {
    var detail = {
      previous: oldPanelHash,
      current: newPanelHash
    };
    var event = new CustomEvent('panelready', {detail: detail});
    window.dispatchEvent(event);
  };

  return {
    /**
     * Typically used with phone size device layouts.
     *
     * @alias module:PageTransitions#oneColumn
     * @param {String} oldPanel
     * @param {String} newPanel
     * @param {Function} callback
     */
    oneColumn: function pt_one_column(oldPanel, newPanel, callback) {
      if (oldPanel === newPanel) {
        callback();
        return;
      }

      // switch previous/current classes
      if (oldPanel) {
        oldPanel.className = newPanel.className ? '' : 'previous';
      }
      if (newPanel.className === 'current') {
        _sendPanelReady(oldPanel && '#' + oldPanel.id, '#' + newPanel.id);

        if (callback) {
          callback();
        }
        return;
      }

      // A hidden or newly inserted panel may not animate. Complete navigation
      // in that case too, otherwise its onShow hook never runs.
      var completed = false;
      var fallback;
      function paintWait(event) {
        if (event && event.target !== newPanel) {
          return;
        }
        if (completed) {
          return;
        }
        completed = true;
        clearTimeout(fallback);
        newPanel.removeEventListener('transitionend', paintWait);
        newPanel.removeEventListener('transitioncancel', paintWait);
        _sendPanelReady(oldPanel && '#' + oldPanel.id, '#' + newPanel.id);
        if (callback) {
          callback();
        }
      }
      newPanel.addEventListener('transitionend', paintWait);
      newPanel.addEventListener('transitioncancel', paintWait);
      newPanel.className = 'current';
      var style = window.getComputedStyle(newPanel);
      var seconds = function(value) {
        return parseFloat(value) * (value.trim().endsWith('ms') ? 1 : 1000) || 0;
      };
      var durations = style.transitionDuration.split(',').map(seconds);
      var delays = style.transitionDelay.split(',').map(seconds);
      var duration = Math.max.apply(Math, durations.map(function(value, index) {
        return value + delays[index % delays.length];
      }));
      fallback = setTimeout(paintWait, Math.max(0, duration) + 100);

      /**
       * Most browsers now scroll content into view taking CSS transforms into
       * account.  That's not what we want when moving between <section>s,
       * because the being-moved-to section is offscreen when we navigate to its
       * #hash.  The transitions assume the viewport is always at document 0,0.
       * So add a hack here to make that assumption true again.
       * https://bugzilla.mozilla.org/show_bug.cgi?id=803170
       */
      if ((window.scrollX !== 0) || (window.scrollY !== 0)) {
        window.scrollTo(0, 0);
      }

    },

    /**
     * Typically used with tablet size device layouts.
     *
     * @alias module:PageTransitions#twoColumn
     * @param {String} oldPanel
     * @param {String} newPanel
     * @param {Function} callback
     */
    twoColumn: function pt_two_column(oldPanel, newPanel, callback) {
      if (oldPanel === newPanel) {
        callback();
        return;
      }

      if (oldPanel) {
        oldPanel.className = newPanel.className ? '' : 'previous';
        newPanel.className = 'current';
        _sendPanelReady('#' + oldPanel.id, '#' + newPanel.id);
      } else {
        newPanel.className = 'current';
        _sendPanelReady(null, '#' + newPanel.id);
      }

      if (callback) {
        callback();
      }
    }
  };
});
