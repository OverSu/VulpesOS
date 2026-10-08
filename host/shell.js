'use strict';
const { Runtime } = ChromeUtils.importESModule('resource://vulpes/host/Runtime.sys.mjs');
const { Views } = ChromeUtils.importESModule('resource://vulpes/host/Views.sys.mjs');
const fullscreenHost = Services.env.get('VULPES_FULLSCREEN') === '1';
if (fullscreenHost) {
  // Set native window decoration before the Wayland surface is mapped.
  document.documentElement.setAttribute('hidechrome', 'true');
  document.documentElement.setAttribute('home-active', '');
}
window.addEventListener('load', async () => {
  try {
    if (fullscreenHost) {
      window.fullScreen = true;
      let last = '', stableSince = performance.now();
      const deadline = performance.now() + 5000;
      while (performance.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 50));
        const size = `${innerWidth}x${innerHeight}@${devicePixelRatio}`;
        if (size !== last) { last = size; stableSince = performance.now(); }
        if (window.fullScreen && innerWidth > 0 && innerHeight > 0 && performance.now() - stableSince >= 500) break;
      }
    }
    window.vulpesStartup = {width:innerWidth,height:innerHeight,dpr:devicePixelRatio,fullscreen:window.fullScreen};
    await Runtime.init();
    Services.ppmm.sharedData.set('vulpes:native-input',Services.env.get('VULPES_TUNDRA')==='1' || Services.env.get('VULPES_TEST_INPUT')==='1');
    Services.ppmm.sharedData.flush();
    if (Services.env.get('VULPES_TUNDRA') === '1') {
      let session, sequence = 0, stopped = false;
      addEventListener('unload', () => { stopped = true; });
      const pollKeys = async () => {
        try {
          const state = await IOUtils.readJSON('/run/tundra-buttons/events.json');
          if (state.session !== session) { session = state.session; sequence = state.sequence; }
          else if (Date.now()/1000-state.recordedAt < 5) {
            for (const event of state.events) if (event.id > sequence) {
              Runtime.broadcast('hardware-key', {type:event.type}, 'system');
              sequence = event.id;
            }
          }
        } catch (_) { /* Service may still be starting. */ }
        if (!stopped) setTimeout(pollKeys, 80);
      };
      pollKeys();
    }
    ChromeUtils.registerWindowActor('Vulpes', {
      parent: { esModuleURI: 'resource://vulpes/host/actors/VulpesParent.sys.mjs' },
      child: {
        esModuleURI: 'resource://vulpes/host/actors/VulpesChild.sys.mjs',
        events: { DOMDocElementInserted: { capture: true }, focusin:{capture:true}, pointerdown:{capture:true} },
      },
      allFrames: true,
      safeForUntrustedWebProcess: true,
      matches: Runtime.apps.filter(app=>!app.installed).map((app) => 'http://' + Services.io.newURI(app.origin).host + '/*'),
    });
    ChromeUtils.registerWindowActor('VulpesMarketplace', {
      parent:{esModuleURI:'resource://vulpes/host/actors/MarketplaceParent.sys.mjs'},
      child:{esModuleURI:'resource://vulpes/host/actors/MarketplaceChild.sys.mjs',events:{DOMContentLoaded:{capture:true}}},
      allFrames:true,safeForUntrustedWebProcess:true,matches:['https://vulpes-os.org/marketplace/*']
    });
    ChromeUtils.registerWindowActor('VulpesTouch', {
      child: {
        esModuleURI: 'resource://vulpes/host/actors/TouchChild.sys.mjs',
        events: { DOMDocElementInserted: { capture: true } },
      },
      allFrames: true,
      safeForUntrustedWebProcess: true,
    });
    const browser = document.createXULElement('browser');
    browser.id = 'system';
    browser.fxrPermissionPrompt = (request) => Runtime.platform.mediaPermission(browser, request);
    browser.setAttribute('type', 'content');
    browser.setAttribute('remote', 'true');
    browser.setAttribute('remoteType', 'web');
    browser.setAttribute('maychangeremoteness', 'true');
    browser.style.cssText = 'display:block;width:480px;height:800px';
    document.getElementById('screen').append(browser);
    // A standalone compositor owns the whole display; desktop windows retain
    // their existing phone dimensions unless the launcher requests fullscreen.
    {
      const screen = document.getElementById('screen');
      const homeButton = document.getElementById('home');
      const resize = () => {
        const landscape = window.innerWidth > window.innerHeight;
        const overlay = document.documentElement.hasAttribute('home-active');
        const width = Math.max(1, window.innerWidth - (landscape && !overlay ? 44 : 0));
        const height = Math.max(1, window.innerHeight - (!landscape && !overlay ? 44 : 0));
        screen.style.width = width + 'px';
        screen.style.height = height + 'px';
        browser.style.width = width + 'px';
        browser.style.height = height + 'px';
        homeButton.style.width = landscape ? '44px' : window.innerWidth + 'px';

      };
      window.addEventListener('resize', resize);
      window.setHomeSurface = (home) => {
        document.documentElement.toggleAttribute('home-active', home);
        resize();
      };
      window.setHomeScrollBottom = (bottom) => {
        document.documentElement.toggleAttribute('home-at-bottom', bottom);
      };
      if (Services.env.get('VULPES_FULLSCREEN') === '1') window.fullScreen = true;
      resize();
    }

    // Unlike a Firefox tab, this browser has no tab manager to activate it.
    // Wayland otherwise leaves its documents hidden and CSS animations paused.
    const activate = () => {
      if (Services.env.get('VULPES_FULLSCREEN') === '1') window.browsingContext.isActive = true;
      browser.docShellIsActive = true;
    };
    browser.addEventListener('XULFrameLoaderCreated', activate);
    browser.addEventListener('DidChangeBrowserRemoteness', activate);
    browser.addProgressListener(
      {
        QueryInterface: ChromeUtils.generateQI([
          'nsIWebProgressListener',
          'nsISupportsWeakReference',
        ]),
        onLocationChange: activate,
        onStateChange: activate,
      },
      Ci.nsIWebProgress.NOTIFY_LOCATION | Ci.nsIWebProgress.NOTIFY_STATE_WINDOW,
    );
    activate();
    window.addEventListener('activate', activate);
    window.addEventListener('sizemodechange', activate);
    window.addEventListener('MozAfterPaint', activate, { once: true });
    // The fullscreen widget is mapped asynchronously under Wayland.
    if (Services.env.get('VULPES_FULLSCREEN') === '1') window.setTimeout(activate, 1000);
    const nativeTouch = Services.env.get('VULPES_NATIVE_TOUCH') === '1';
    Services.ppmm.sharedData.set('vulpes:native-touch', nativeTouch);
    if (!nativeTouch) {
      browser.browsingContext.inRDMPane = true;
      browser.browsingContext.setRDMPaneMaxTouchPoints(1);
      browser.browsingContext.touchEventsOverride = 'enabled';
    }
    Services.ppmm.sharedData.set('vulpes:host-contexts', [browser.browsingContext.id]);
    Services.ppmm.sharedData.flush();
    browser.loadURI(
      Services.io.newURI(Runtime.apps.find((app) => app.id === 'system').origin + '/index.html'),
      {
        triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
      },
    );
    window.hostReady = true;
    // Standalone windows have no SessionStore to release extension startup.
    // Firefox exposes this notification for embedders (e.g. Firefox Reality).
    Services.obs.notifyObservers(null, 'extensions-late-startup');
    const pruneTimer = setInterval(() => Views.prune(), 1000);
    window.addEventListener('unload', () => clearInterval(pruneTimer), { once: true });
    const home = document.getElementById('home');
    let holdTimer,
      held = false;
    home.title = 'Accueil · maintenir pour les applications ouvertes (Ctrl+Espace)';
    home.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      held = false;
      home.setPointerCapture(event.pointerId);
      holdTimer = setTimeout(() => {
        held = true;
        Views.hideAll();
        Runtime.broadcast('holdhome', {}, 'system');
      }, 650);
    });
    const cancel = () => clearTimeout(holdTimer);
    home.addEventListener('contextmenu', event => event.preventDefault());
    home.addEventListener('pointerup', cancel);
    home.addEventListener('pointercancel', cancel);
    home.addEventListener('click', () => {
      if (!held) {Views.hideAll();Runtime.broadcast('home', {}, 'system');}
      held = false;
    });
    window.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.code === 'Space') {
        event.preventDefault();
        Views.hideAll();
        Runtime.broadcast('holdhome', {}, 'system');
      }
    });
    dump('VULPES CURRENT HOST ' + Services.appinfo.platformVersion + '\n');
  } catch (error) {
    console.error(error);
    dump('VULPES HOST ERROR ' + error + '\n' + error.stack + '\n');
  }
});
