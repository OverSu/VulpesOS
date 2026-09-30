;'use strict';var PlaybackQueue=(function(){var SETTINGS_OPTION_KEY='settings_option_key';var Repeat={OFF:0,LIST:1,SONG:2,next:function(val){return(val+1)%3;}};function posmod(a,b){var r=a%b;return r<0?r+b:r;}
function fillIndices(length){var indices=new Array(length);for(var i=0;i<length;i++){indices[i]=i;}
return indices;}
function shuffle(list){for(var i=list.length-1;i>=1;i--){var j=Math.floor(Math.random()*(i+1));if(j<i){var tmp=list[j];list[j]=list[i];list[i]=tmp;}}}
function BaseQueue(){this._index=null;}
BaseQueue.prototype={_init:function(index){if(this.length===0){throw Error('cannot have an empty queue');}
this._index=index||0;this._shuffle(playbackSettings.shuffle,index!==undefined);},_shuffle:function(enabled,keepIndex=true){this._shuffleTime=Date.now();if(!enabled){if(keepIndex){this._index=this.index;}
delete this._shuffledList;return;}
this._shuffledList=fillIndices(this.length);var oldIndex=null;if(keepIndex){oldIndex=this._shuffledList.splice(this._index,1)[0];this._index=0;}
shuffle(this._shuffledList);if(keepIndex){this._shuffledList.unshift(oldIndex);}},next:function(automatic=false){return this.advance(1,automatic);},previous:function(){this.advance(-1);},advance:function(offset,automatic=false){var next;var justShuffled=false;if(this._shuffleTime<shuffleTime){this._shuffle(playbackSettings.shuffle);justShuffled=true;}
switch(PlaybackQueue.repeat){case Repeat.OFF:next=Math.max(this._index+offset,0);break;case Repeat.LIST:next=posmod(this._index+offset,this.length);var cycled=next!==this._index+offset;if(playbackSettings.shuffle&&cycled&&!justShuffled){this._shuffle(true);}
break;case Repeat.SONG:next=automatic?this._index:Math.max(this._index+offset,0);break;default:throw new Error('unexpected repeat status: '+this.repeat);}
if(next>=this.length){this._index=null;return false;}
this._index=next;return true;},get index(){return this._shuffledList?this._shuffledList[this._index]:this._index;},get rawIndex(){return this._index;}};function StaticQueue(fileinfos,index){this._fileinfos=fileinfos;this._init(index);}
StaticQueue.prototype=new BaseQueue();Object.defineProperty(StaticQueue.prototype,'length',{get:function(){return this._fileinfos.length;}});StaticQueue.prototype.current=function(){return Promise.resolve(this._fileinfos[this.index]);};function DynamicQueue(query,index){this._query=query;this._init(index);}
DynamicQueue.prototype=new BaseQueue();Object.defineProperty(DynamicQueue.prototype,'length',{get:function(){return this._query.count;}});DynamicQueue.prototype.current=function(){var query=this._query;return new Promise((resolve,reject)=>{var handle=Database.advancedEnumerate(query.key,query.range,query.direction,this.index,(record)=>{Database.cancelEnumeration(handle);resolve(record);});});};var playbackSettings=null;var shuffleTime=0;function loadSettings(){return new Promise((resolve,reject)=>{asyncStorage.getItem(SETTINGS_OPTION_KEY,(settings)=>{if(settings){playbackSettings=settings;}else{playbackSettings={repeat:Repeat.OFF,shuffle:false};}
resolve();});});}
function saveSettings(){return new Promise((resolve,reject)=>{asyncStorage.setItem(SETTINGS_OPTION_KEY,playbackSettings,()=>{resolve();});});}
return{StaticQueue:StaticQueue,DynamicQueue:DynamicQueue,Repeat:Repeat,loadSettings:loadSettings,get repeat(){return playbackSettings.repeat;},set repeat(val){playbackSettings.repeat=val;saveSettings();return val;},get shuffle(){return playbackSettings.shuffle;},set shuffle(val){playbackSettings.shuffle=val;shuffleTime=Date.now();saveSettings();return val;},};})();