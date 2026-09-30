#!/usr/bin/env python3
"""Explicit, idempotent syntax repairs for sources and prebuilt migration assets."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
replacements = {
    "timestamp: String(message.timestamp)": "timestamp: String(+message.timestamp)",
    "timestamp:String(message.timestamp)": "timestamp:String(+message.timestamp)",
    "if (l10nAttrs.raw) {": 'if (typeof l10nAttrs.raw === "string") {',
    "if(l10nAttrs.raw){": 'if(typeof l10nAttrs.raw==="string"){',
    "this.startupMetadata.splice(entry, 1);\n        icon.updateName();": "this.startupMetadata.splice(entry, 1);\n        icon.updateName();\n        if (window.VulpesCompat && icon.app) icon.refresh(); // Replace legacy rasterized cache with original app assets.",
    "this.startupMetadata.splice(entry,1);icon.updateName();": "this.startupMetadata.splice(entry,1);icon.updateName();if(window.VulpesCompat&&icon.app)icon.refresh();",
    "menuStatus = document.getElementById('fxa-desc');": "menuStatus = document.getElementById('fxa-desc');\n    if(window.VulpesCompat){menuStatus.removeAttribute('data-l10n-id');menuStatus.textContent=(document.documentElement.lang||navigator.language).startsWith('fr')?'Service non disponible sur ce bureau':'Service unavailable on this desktop';return;}",
    "menuStatus=document.getElementById('fxa-desc');": "menuStatus=document.getElementById('fxa-desc');if(window.VulpesCompat){menuStatus.removeAttribute('data-l10n-id');menuStatus.textContent=(document.documentElement.lang||navigator.language).startsWith('fr')?'Service non disponible sur ce bureau':'Service unavailable on this desktop';return;}",
    "var onImageLoad = (evt) => {\n    window.requestAnimationFrame(() => {\n      var newActiveImage = evt.target.closest('img:not(.active)');": "var onImageLoad = (evt) => {\n    const image = evt.target;\n    window.requestAnimationFrame(() => {\n      var newActiveImage = image.closest('img:not(.active)');",
    "var onImageLoad=(evt)=>{window.requestAnimationFrame(()=>{var newActiveImage=evt.target.closest('img:not(.active)');": "var onImageLoad=(evt)=>{const image=evt.target;window.requestAnimationFrame(()=>{var newActiveImage=image.closest('img:not(.active)');",
    "var sdcard = navigator.getDeviceStorage('sdcard');\n    var request = sdcard.get(captionsFilename);": "var sdcard = navigator.getDeviceStorage('sdcard');\n    if (!sdcard) return; // Captions are optional on desktop.\n    var request = sdcard.get(captionsFilename);",
    "var sdcard=navigator.getDeviceStorage('sdcard');var request=sdcard.get(captionsFilename);": "var sdcard=navigator.getDeviceStorage('sdcard');if(!sdcard)return;var request=sdcard.get(captionsFilename);",
    "this.activeAlarm.snoozeAlarm(alert.id);\n    window.close();": "this.activeAlarm.snoozeAlarm(alert.id).then(() => window.close()).catch(console.error);",
    "this.activeAlarm.close(alert.type, alert.id);\n    window.close();": "this.activeAlarm.close(alert.type, alert.id).then(() => window.close()).catch(console.error);",
    "_messageHandler: function(evt) {\n      var data = evt.data;": "_messageHandler: function(evt) {\n      if (!evt.source || evt.origin !== window.location.origin || !evt.data) return;\n      var data = evt.data;",
    "offscreenImage.src = '';": "offscreenImage.onload = offscreenImage.onerror = null; offscreenImage.removeAttribute('src');",
    "offscreenImage.src='';": "offscreenImage.onload=offscreenImage.onerror=null;offscreenImage.removeAttribute('src');",
    "exports.scheduler = exports.scheduler || new Scheduler();": "if (!exports.scheduler || typeof exports.scheduler.mutation !== 'function') Object.defineProperty(exports, 'scheduler', {value:new Scheduler(),configurable:true,writable:true});",
    "exports.scheduler=exports.scheduler||new Scheduler();": "if(!exports.scheduler||typeof exports.scheduler.mutation!=='function')Object.defineProperty(exports,'scheduler',{value:new Scheduler(),configurable:true,writable:true});",
    "function postMessageSync(win, data, transfer) {": "function postMessageSync(win, data, transfer) { try { void win.document; } catch (_) { win.postMessage(data, location.origin, transfer || []); return; }",
    "function postMessageSync(win,data,transfer){": "function postMessageSync(win,data,transfer){try{void win.document;}catch(_){win.postMessage(data,location.origin,transfer||[]);return;}",
    "this.childWindow = window.open(this.url, '_blank', 'attention');": "this.childWindow = window.VulpesCompat ? VulpesCompat.openAttention(this.url) : window.open(this.url, '_blank', 'attention');",
    "style: function(baseUrl) {": "style: function(baseUrl) { if (window.VulpesCompat) { window.VulpesCompat.componentStyle(this, baseUrl).catch(console.error); return; }",
    "style:function(baseUrl){": "style:function(baseUrl){if(window.VulpesCompat){window.VulpesCompat.componentStyle(this,baseUrl).catch(console.error);return;}",
    "shimHostIframe.contentDocument.readyState === 'complete' ?": "typeof shimHostIframe.contentWindow.bootstrap === 'function' ?",
    "shimHostIframe.contentDocument.readyState==='complete'?": "typeof shimHostIframe.contentWindow.bootstrap==='function'?",
    "hardwareHomeButton: '(-moz-physical-home-button)'": "hardwareHomeButton: window.VulpesCompat ? '(min-width: 0px)' : '(-moz-physical-home-button)'",
    "hardwareHomeButton:'(-moz-physical-home-button)'": "hardwareHomeButton:window.VulpesCompat?'(min-width: 0px)':'(-moz-physical-home-button)'",
    "new AudioContext(this._channel)": "new AudioContext()",
    "var doc = (parent.location === window.location) ?\n      document : parent.document;": 'var doc = document; try { if (!document.getElementById("confirmation-message")) doc = parent.document; } catch (_) {}',
    "var doc=(parent.location===window.location)?document:parent.document;": 'var doc=document;try{if(!document.getElementById("confirmation-message"))doc=parent.document;}catch(_){}',
    "window.scheduler || schedulerShim()": '(window.scheduler && typeof window.scheduler.mutation === "function" ? window.scheduler : schedulerShim())',
    "window.scheduler||schedulerShim()": '(window.scheduler&&typeof window.scheduler.mutation==="function"?window.scheduler:schedulerShim())',
    "div.querySelector(':host'); return true;": "div.querySelector(':host'); div.querySelector('::content'); return true;",
    "div.querySelector(':host');return true;": "div.querySelector(':host');div.querySelector('::content');return true;",
    "this._screenBrightnessTransition &&\n      this._screenBrightnessTransition.transitionTo(this._targetBrightness);": "if (this._screenBrightnessTransition) {\n        this._screenBrightnessTransition.transitionTo(this._targetBrightness);\n      } else {\n        power.screenBrightness = this._targetBrightness;\n      }",
    "this._screenBrightnessTransition&&this._screenBrightnessTransition.transitionTo(this._targetBrightness);": "this._screenBrightnessTransition?this._screenBrightnessTransition.transitionTo(this._targetBrightness):(power.screenBrightness=this._targetBrightness);",
    "window.open(url, '_blank', 'remote=true');": "new MozActivity({name:'view',data:{type:'url',url:url}});",
    "window.open(url,'_blank','remote=true');": "new MozActivity({name:'view',data:{type:'url',url:url}});",
    "newDate.toLocaleFormat('%p')": "new Intl.DateTimeFormat(navigator.language, {hour:'numeric', hour12:true}).formatToParts(newDate).find(part => part.type === 'dayPeriod').value",
    "gaia-container { position: relative; display: block; }": " :host { position: relative; display: block; }",
    "[for (v of voices) v.lang.split('-')[0]]": "voices.map(v => v.lang.split('-')[0])",
    "[for (p of pat) new SingleMatchPattern(p)]": "Array.from(pat, p => new SingleMatchPattern(p))",
    "[for(p of pat)new SingleMatchPattern(p)]": "Array.from(pat, p => new SingleMatchPattern(p))",
    "window.scheduler || {": '(window.scheduler && typeof window.scheduler.mutation === "function" ? window.scheduler : null) || {',
    "window.scheduler||{": '(window.scheduler&&typeof window.scheduler.mutation==="function"?window.scheduler:null)||{',
    "this._pendingIconUrl = 'app-icon';": "this._pendingIconUrl = 'app-icon';\n              if (window.VulpesCompat) { this._vulpesSourceIcon = blob; this._hasUserSetIcon = true; } // Keep original app pixels; skip the legacy canvas pass.",
    "this._pendingIconUrl='app-icon';": "this._pendingIconUrl='app-icon';if(window.VulpesCompat){this._vulpesSourceIcon=blob;this._hasUserSetIcon=true;}",
    "Object.defineProperty(proto, 'icon', {\n    get: function() {\n      return new Promise((resolve, reject) => {": "Object.defineProperty(proto, 'icon', {\n    get: function() {\n      if (window.VulpesCompat && this.app && this._vulpesSourceIcon) return Promise.resolve(this._vulpesSourceIcon);\n      return new Promise((resolve, reject) => {",
    "Object.defineProperty(proto,'icon',{get:function(){return new Promise((resolve,reject)=>{": "Object.defineProperty(proto,'icon',{get:function(){if(window.VulpesCompat&&this.app&&this._vulpesSourceIcon)return Promise.resolve(this._vulpesSourceIcon);return new Promise((resolve,reject)=>{",
    "if (window.VulpesCompat && appOrBookmark.manifest?.icons?.['512']?.includes('vulpes-browser.png')) icon.refresh();": "if (window.VulpesCompat && icon.app) icon.refresh(); // Replace legacy rasterized cache with original app assets.",
    "if(window.VulpesCompat&&appOrBookmark.manifest?.icons?.['512']?.includes('vulpes-browser.png'))icon.refresh();": "if(window.VulpesCompat&&icon.app)icon.refresh();",
}
for name in ["gaia", "assets/webapps"]:
    count = 0
    for path in (ROOT / name).rglob("*.js"):
        if not path.is_file() or "/test/" in str(path):
            continue
        try:
            original = path.read_text()
        except UnicodeDecodeError:
            continue
        text = original
        if path.name == "main.js" and "camera.gaiamobile.org" in str(path):
            text = (
                text.replace(
                    "require(['main']);",
                    "if (!window.VulpesCompat || navigator.mozCameras) require(['main']);",
                )
                if "if (!window.VulpesCompat || navigator.mozCameras)" not in text
                else text
            )
        if path.name == "fxa_iac_client.js":
            text = text.replace(
                "callback&&callback();});",
                "callback&&callback();}).catch(function(error){callback&&callback(error);});",
            )
            text = text.replace(
                "connect(function(){_sendMessage(message,successCb,errorCb);",
                "connect(function(error){if(error){errorCb&&errorCb(error);return;}_sendMessage(message,successCb,errorCb);",
            )
        for old, new in replacements.items():
            if new not in text:
                text = text.replace(old, new)
        if text != original:
            path.write_text(text)
            count += 1
    print(name, count, "files updated")

# Native boot overlays keep the immutable Gaia system image. Include both SMS
# entry points: the old architecture lazy-loads conversation.js separately.
for relative in ("views/conversation/js/conversation.js", "views/conversation/gaia_build_defer_index.js"):
    source = ROOT / "assets/webapps/sms.gaiamobile.org" / relative
    target = ROOT / "overrides/sms.gaiamobile.org" / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(source.read_bytes())

# Preserve bundled item definitions, replacing only the root dependency list.
# Unsupported hardware modules must not execute and break unrelated Settings UI.
path = ROOT / "assets/webapps/settings.gaiamobile.org/js/panels/root/low_priority_items.js"
if path.is_file():
    text = path.read_text()
    marker = "/* VULPES_ROOT_CAPABILITIES */"
    old = "define('panels/root/low_priority_items',"
    start = text.find(marker) if marker in text else text.find(old)
    if start < 0:
        raise RuntimeError("Settings root bundle has changed; review capability adapter")
    replacement = (
        text[:start]
        + marker
        + "\n"
        + (ROOT / "gaia/apps/settings/js/panels/root/low_priority_items.js").read_text()
    )
    if replacement != text:
        path.write_text(replacement)
