'use strict';
/*
 * This code is in charge of launching a diferent window
 * to handle if one or more contacts have the same info
 * that the one we are trying to save.
 */
 
(function(exports) {
  var matchService = {};

  const CONTACTS_APP_ORIGIN = location.origin;
  
  var matcherWindow = null;
  var matcherFrame = null;
  var currentURL;

  function openWindow(url) {
    if (!url || matcherWindow !== null) {
      return;
    }
    if (window.VulpesCompat) {
      // Keep Gaia's real duplicate-management view inside the Contacts app.
      // It communicates with this window through the original postMessage API.
      matcherFrame = document.createElement('iframe');
      matcherFrame.title = 'Contacts';
      matcherFrame.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:1000;background:white';
      matcherFrame.src = url;
      document.body.appendChild(matcherFrame);
      matcherWindow = matcherFrame.contentWindow;
    } else {
      matcherWindow = window.open(url);
    }
    currentURL = url;
    init();
  }

  function closeWindow(messageId, additionalMessageId) {
    if (!matcherWindow) return;
    if (matcherFrame) {
      matcherFrame.remove(); matcherFrame = null;
    } else {
      matcherWindow.close();
    }
    unload();
  }

  matchService.match = function(contactId) {
    var url =
      '/contacts/views/matching/matching_contacts.html?contactId=' +
      contactId;
    openWindow(url);
  };

  matchService.showDuplicateContacts = function() {
    var url =
      '/contacts/views/matching/matching_contacts.html';
    openWindow(url);
  };

  function init(){
    var target = matcherFrame || matcherWindow;
    target.addEventListener('load', function fn(){
      target.removeEventListener('load', fn);
      if (matcherFrame) matcherWindow = matcherFrame.contentWindow;
      matcherWindow.postMessage({
        type: 'sync'
      }, CONTACTS_APP_ORIGIN);
      if (!matcherFrame) matcherWindow.onunload = function(){
        window.postMessage({
          type: 'window_close'
        }, CONTACTS_APP_ORIGIN);
      };
    }, false);
  }

  // This function can also be executed when other messages arrive
  // That's why we cannot call notifySettings outside the switch block
  function messageHandler(e) {
    if (!currentURL || e.origin !== CONTACTS_APP_ORIGIN) {
      return;
    }

    var data = e.data;

    switch (data.type) {
      case 'ready':
        matcherWindow.postMessage({
          type: 'dom_transition_end',
          data: ''
        }, CONTACTS_APP_ORIGIN);
        window.dispatchEvent(new CustomEvent('image-loader-pause'));
        break;
      case 'window_close':
        closeWindow(data.messageId, data.additionalMessageId);
        break;
      case 'show_duplicate_contacts':
        matcherWindow.postMessage(data, CONTACTS_APP_ORIGIN);
        break;
      case 'duplicate_contacts_merged':
        matcherWindow.postMessage(data, CONTACTS_APP_ORIGIN);
        break;
    }
  }

  function unload() {
    // Attaching again scrolling handlers on the contact list's image loader
    matcherWindow = currentURL = null;
    window.dispatchEvent(new CustomEvent('image-loader-resume'));
  }

  window.addEventListener('message', messageHandler);

  exports.MatchService = matchService;

}(window));
