;'use strict';var ForwardRewindController=(function(){var isLongPressing=false;var intervalId=null;var forwardButton;var backwardButton;var videoToolbar;var player;var seekHelper;function init(video,forward,backward,seeker){forwardButton=forward;backwardButton=backward;player=video;seekHelper=seeker;videoToolbar=forward.parentElement;videoToolbar.addEventListener('click',handleButtonClick);videoToolbar.addEventListener('contextmenu',handlePlayerLongPress);videoToolbar.addEventListener('touchend',stopFastSeeking);}
function uninit(video,forward,backward){videoToolbar.removeEventListener('click',handleButtonClick);videoToolbar.removeEventListener('contextmenu',handlePlayerLongPress);videoToolbar.removeEventListener('touchend',stopFastSeeking);forwardButton=null;backwardButton=null;player=null;}
function handleButtonClick(event){if(event.target===forwardButton){startFastSeeking(1);}else if(event.target===backwardButton){startFastSeeking(-1);}else{return;}}
function handlePlayerLongPress(event){if(event.target===forwardButton){isLongPressing=true;startFastSeeking(1);}else if(event.target===backwardButton){isLongPressing=true;startFastSeeking(-1);}else{return;}}
function startFastSeeking(direction){var offset=direction*10;if(isLongPressing){intervalId=window.setInterval(function(){seekVideo(player.currentTime+offset);},1000);}else{seekVideo(player.currentTime+offset);}}
function stopFastSeeking(){if(intervalId){window.clearInterval(intervalId);intervalId=null;isLongPressing=false;}}
function seekVideo(seekTime){if(seekTime>=player.duration||seekTime<0){if(isLongPressing){stopFastSeeking();}
if(seekTime>=player.duration){seekTime=player.duration;pause();}
else{seekTime=0;}}
if(seekHelper){seekHelper.seekTo(seekTime);}
else{player.fastSeek(seekTime);}}
return{init:init,uninit:uninit,stopFastSeeking:stopFastSeeking};}());