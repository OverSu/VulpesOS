;'use strict';(function(exports){var KeyboardConsole=function KeyboardConsole(){this._timers=null;};KeyboardConsole.prototype.start=function(){var timers=this._timers=new Map();timers.set('domLoading',performance.timing.domLoading);this._startTime=Date.now();};KeyboardConsole.prototype.LOG_LEVEL=0;KeyboardConsole.prototype.trace=function(){if(this.LOG_LEVEL<3){return;}
console.trace.apply(console,arguments);};KeyboardConsole.prototype.time=function(timerName){if(this.LOG_LEVEL<2){return;}
console.time(timerName);};KeyboardConsole.prototype.timeEnd=function(timerName){if(this.LOG_LEVEL<2){return;}
if(this._timers.has(timerName)){console.log(timerName+': '+
(Date.now()-this._timers.get(timerName))+'ms');return;}
console.timeEnd(timerName);};KeyboardConsole.prototype.log=function(){if(this.LOG_LEVEL<2){return;}
console.log.apply(console,arguments);};KeyboardConsole.prototype.info=function(){if(this.LOG_LEVEL<1){return;}
console.info.apply(console,arguments);};exports.KeyboardConsole=KeyboardConsole;})(window);