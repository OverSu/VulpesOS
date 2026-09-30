;'use strict';function onLoadCallScreen(evt){window.removeEventListener('load',onLoadCallScreen);CallsHandler.setup();CallScreen.init();KeypadManager.init(true);}
function unloadCallScreen(evt){}
window.addEventListener('load',onLoadCallScreen);window.addEventListener('unload',unloadCallScreen);