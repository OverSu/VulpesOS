;'use strict';function eventSafety(obj,event,callback,timeout){if(typeof callback==='number'){timeout=callback;callback=null;}
if(!timeout){throw new Error('You must pass a valid timeout value to `eventSafety`.');}
return new Promise((resolve)=>{var finishTimeout;function done(e){if(e&&e.target!==obj&&(e.type==='transitionend'||e.type==='animationend')){return;}
clearTimeout(finishTimeout);obj.removeEventListener(event,done);if(callback){resolve(callback.apply(this,arguments));}else{resolve(e);}}
finishTimeout=setTimeout(done,timeout);obj.addEventListener(event,done);});}