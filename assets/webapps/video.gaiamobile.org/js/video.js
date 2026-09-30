;'use strict';const LAYOUT_MODE={list:'layout-list',selection:'layout-selection',fullscreenPlayer:'layout-fullscreen-player'};var dom={};var ids=['thumbnail-list-title','thumbnails','thumbnails-video-button','thumbnails-select-button','thumbnails-delete-button','thumbnails-share-button','thumbnails-select-top','thumbnails-number-selected','player-view','fullscreen-button','spinner-overlay','thumbnails-single-delete-button','thumbnails-single-share-button','thumbnails-single-info-button','info-view','info-close-button','player','overlay','overlay-title','overlay-text','overlay-menu','overlay-action-button','player-header','video-container','videoBar','videoControlBar','close','play','playHead','timeSlider','elapsedTime','video-title','duration-text','elapsed-text','bufferedTime','slider-wrapper','throbber','picker-close','picker-title','picker-header','picker-done','options','options-view','seek-backward','seek-forward','in-use-overlay','in-use-overlay-title','in-use-overlay-text'];ids.forEach(function createElementRef(name){dom[toCamelCase(name)]=document.getElementById(name);});dom.player.mozAudioChannelType='content';function $(id){return document.getElementById(id);}
var seeker=new Seeker(dom.player);var captions=new Captions(dom.player);var playing=false;var playerShowing=false;var controlShowing=false;var controlFadeTimeout=null;var selectedFileNames=[];var selectedFileNamesToBlobs={};var videodb;var currentVideo;var currentVideoBlob;var firstScanEnded=false;var THUMBNAIL_WIDTH;var THUMBNAIL_HEIGHT;var HAVE_NOTHING=0;var storageState;var currentOverlay;var dragging=false;var touchStartID=null;var sliderRect;var thumbnailList;var pendingPick;var videoHardwareReleased=false;var restoreTime=null;var isPhone;var isPortrait;var currentLayoutMode;var pendingUpdateTitleText=false;var FROMCAMERA=/DCIM\/\d{3}MZLLA\/VID_\d{4}\.3gp$/;var loadingChecker=new VideoLoadingChecker(dom.player,dom.inUseOverlay,dom.inUseOverlayTitle,dom.inUseOverlayText);var lastPlayTime=0;init();dom.player.addEventListener('play',function(){lastPlayTime=window.performance.now();});dom.player.addEventListener('mozinterruptbegin',function(){if((window.performance.now()-lastPlayTime)>50){pause();lastPlayTime=0;}});document.addEventListener('visibilitychange',function visibilityChange(){if(document.hidden){stopParsingMetadata();if(playing){pause();}}
else{if(playerShowing){if(videoHardwareReleased){restoreVideo();}
setControlsVisibility(true);}else{startParsingMetadata();}}});var acm=navigator.mozAudioChannelManager;if(acm){acm.addEventListener('headphoneschange',function onheadphoneschange(){if(!acm.headphones&&playing){setVideoPlaying(false);}});}
navigator.mozSetMessageHandler('activity',handleActivityEvents);function init(){window.performance.mark('navigationLoaded');IntlHelper.define('date-group','datetime',{month:'long',year:'numeric',});thumbnailList=new ThumbnailList(ThumbnailDateGroup,dom.thumbnails);ThumbnailItem.titleMaxLines=isPhone?2:(isPortrait?4:2);initDB();addUIEventListeners();initLayout();initThumbnailSize();function addUIEventListeners(){if(!navigator.mozHasPendingMessage('activity')){initOptionsButtons();}
document.l10n.ready.then(function(){initPlayerControls();});ForwardRewindController.init(dom.player,dom.seekForward,dom.seekBackward,seeker);dom.overlayActionButton.addEventListener('click',function(){if(pendingPick){cancelPick();}else if(currentOverlay==='empty'){launchCameraApp();}});window.performance.mark('navigationInteractive');}}
function initThumbnailSize(){if(isPhone){THUMBNAIL_WIDTH=210*window.devicePixelRatio;THUMBNAIL_HEIGHT=120*window.devicePixelRatio;}else{var shortEdge=Math.min(window.innerWidth,window.innerHeight);THUMBNAIL_WIDTH=424*window.devicePixelRatio*shortEdge/800;THUMBNAIL_HEIGHT=Math.round(THUMBNAIL_WIDTH*4/7);}}
function initLayout(){ScreenLayout.watch('portrait','(orientation: portrait)');isPhone=ScreenLayout.getCurrentLayout('tiny');isPortrait=ScreenLayout.getCurrentLayout('portrait');if(isPhone||isPortrait){dom.spinnerOverlay.classList.add('hidden');setDisabled(dom.playerView,false);}else{dom.spinnerOverlay.classList.remove('hidden');setDisabled(dom.playerView,true);}
window.addEventListener('screenlayoutchange',handleScreenLayoutChange);switchLayout(LAYOUT_MODE.list);}
function initPlayerControls(){dom.sliderWrapper.addEventListener('touchstart',handleSliderTouchStart);dom.sliderWrapper.addEventListener('touchmove',handleSliderTouchMove);dom.sliderWrapper.addEventListener('touchend',handleSliderTouchEnd);dom.player.addEventListener('timeupdate',timeUpdated);dom.player.addEventListener('seeked',updateVideoControlSlider);dom.player.addEventListener('ended',playerEnded);dom.play.addEventListener('click',handlePlayButtonClick);dom.playerHeader.addEventListener('action',handleCloseButtonClick);dom.pickerDone.addEventListener('click',postPickResult);dom.options.addEventListener('click',showOptionsView);dom.videoContainer.addEventListener('click',toggleVideoControls);dom.timeSlider.addEventListener('keypress',handleSliderKeypress);}
function initOptionsButtons(){dom.thumbnailsVideoButton.addEventListener('click',launchCameraApp);dom.thumbnailsSelectButton.addEventListener('click',showSelectView);dom.thumbnailsSelectTop.addEventListener('action',hideSelectView);dom.thumbnailsDeleteButton.addEventListener('click',deleteSelectedItems);dom.thumbnailsShareButton.addEventListener('click',shareSelectedItems);dom.infoCloseButton.addEventListener('click',hideInfoView);dom.optionsView.addEventListener('gaiamenu-cancel',hideOptionsView);dom.fullscreenButton.addEventListener('click',toggleFullscreenPlayer);addEventListeners('.single-delete-button','click',deleteCurrentVideo);addEventListeners('.single-share-button','click',shareCurrentVideo);addEventListeners('.single-info-button','click',showInfoView);}
function addEventListeners(selector,type,listener){var elements=document.body.querySelectorAll(selector);for(var i=0;i<elements.length;i++){elements[i].addEventListener(type,listener);}}
function toggleFullscreenPlayer(){if(currentLayoutMode===LAYOUT_MODE.list){switchLayout(LAYOUT_MODE.fullscreenPlayer);scheduleVideoControlsAutoHiding();}else{switchLayout(LAYOUT_MODE.list);}
VideoUtils.fitContainer(dom.videoContainer,dom.player,currentVideo.metadata.rotation||0);}
function toggleVideoControls(e){if(controlFadeTimeout){clearTimeout(controlFadeTimeout);controlFadeTimeout=null;}
if(!pendingPick){e.cancelBubble=!controlShowing;setControlsVisibility(!controlShowing);}}
function handleScreenLayoutChange(){isPortrait=ScreenLayout.getCurrentLayout('portrait');if(!isPhone){if(!isPortrait&&(!firstScanEnded||processingQueue)){dom.spinnerOverlay.classList.remove('hidden');setDisabled(dom.playerView,true);}else{dom.spinnerOverlay.classList.add('hidden');setDisabled(dom.playerView,false);}
if(currentLayoutMode===LAYOUT_MODE.list){if(isPortrait){hidePlayer(true);}else{showPlayer(currentVideo,false,false,true);}}
ThumbnailItem.titleMaxLines=isPortrait?4:2;}
if(currentLayoutMode!==LAYOUT_MODE.fullscreenPlayer){if(!thumbnailList){return;}
thumbnailList.updateAllThumbnailTitles();}else{pendingUpdateTitleText=true;}
if(dom.player.readyState!==HAVE_NOTHING){VideoUtils.fitContainer(dom.videoContainer,dom.player,currentVideo.metadata.rotation||0);}}
function switchLayout(mode){var oldMode=currentLayoutMode;if(oldMode){document.body.classList.remove(currentLayoutMode);}
currentLayoutMode=mode;document.body.classList.add(currentLayoutMode);if(oldMode===LAYOUT_MODE.fullscreenPlayer&&pendingUpdateTitleText){pendingUpdateTitleText=false;thumbnailList.updateAllThumbnailTitles();}}
function handleActivityEvents(a){var activityName=a.source.name;if(activityName==='pick'){pendingPick=a;showPickView();}}
function showInfoView(){hideOptionsView();var length=isFinite(currentVideo.metadata.duration)?MediaUtils.formatDuration(currentVideo.metadata.duration):'';var type=currentVideo.type;if(type){var index=currentVideo.type.indexOf('/');type=index>-1?currentVideo.type.slice(index+1):currentVideo.type;}
var resolution=(currentVideo.metadata.width&&currentVideo.metadata.height)?currentVideo.metadata.width+'x'+
currentVideo.metadata.height:'';return MediaUtils.getLocalizedSizeTokens(currentVideo.size).then((args)=>{var data={'info-name':{raw:currentVideo.metadata.title},'info-length':{raw:length},'info-size':{id:'fileSize',args:args},'info-type':{raw:type},'info-date':{raw:MediaUtils.formatDate(currentVideo.date)},'info-resolution':{raw:resolution}};MediaUtils.populateMediaInfo(data);setNFCSharing(false);dom.infoView.classList.remove('hidden');document.body.classList.add('info-view');});}
function hideInfoView(){setNFCSharing(true);dom.infoView.classList.add('hidden');document.body.classList.remove('info-view');}
function showSelectView(){hidePlayer(true,function(){switchLayout(LAYOUT_MODE.selection);thumbnailList.setSelectMode(true);clearSelection();});}
function hideSelectView(){clearSelection();thumbnailList.setSelectMode(false);switchLayout(LAYOUT_MODE.list);if(!isPhone&&!isPortrait&&currentVideo){showPlayer(currentVideo,false,false,true);}}
function showOptionsView(){if(playing){pause();}
dom.optionsView.removeAttribute('hidden');document.body.classList.add('options-view');}
function hideOptionsView(){dom.optionsView.setAttribute('hidden',true);document.body.classList.remove('options-view');}
function setDisabled(element,disabled){element.classList.toggle('disabled',disabled);element.setAttribute('aria-disabled',disabled);}
function setSelected(element,selected){element.classList.toggle('selected',selected);element.setAttribute('aria-selected',selected);}
function clearSelection(){Array.forEach(selectedFileNames,function(name){setSelected(thumbnailList.thumbnailMap[name].htmlNode,false);});selectedFileNames=[];selectedFileNamesToBlobs={};setDisabled(dom.thumbnailsDeleteButton,true);setDisabled(dom.thumbnailsShareButton,true);document.l10n.setAttributes(dom.thumbnailsNumberSelected,'number-selected2',{n:0});}
function updateSelection(videodata){var thumbnail=thumbnailList.thumbnailMap[videodata.name];var selected=!thumbnail.htmlNode.classList.contains('selected');setSelected(thumbnail.htmlNode,selected);var filename=videodata.name;if(selected){selectedFileNames.push(filename);videodb.getFile(filename,function(blob){selectedFileNamesToBlobs[filename]=blob;});}
else{delete selectedFileNamesToBlobs[filename];var i=selectedFileNames.indexOf(filename);if(i!==-1){selectedFileNames.splice(i,1);}}
var numSelected=selectedFileNames.length;document.l10n.setAttributes(dom.thumbnailsNumberSelected,'number-selected2',{n:numSelected});var noneSelected=numSelected===0;setDisabled(dom.thumbnailsDeleteButton,noneSelected);setDisabled(dom.thumbnailsShareButton,noneSelected);}
function launchCameraApp(){var a=new MozActivity({name:'record',data:{type:'videos'}});a.onerror=function(){if(a.error.name==='NO_PROVIDER'){document.l10n.formatValue('share-noprovider').then((msg)=>{alert(msg);});}else{console.warn('share activity error:',a.error.name);}};}
function resetCurrentVideo(){if(!currentVideo){return;}
var currentThumbnail=thumbnailList.thumbnailMap[currentVideo.name];currentThumbnail.htmlNode.classList.remove('focused');var nextThumbnail=thumbnailList.findNextThumbnail(currentVideo.name);if(nextThumbnail){currentVideo=nextThumbnail.data;nextThumbnail.htmlNode.classList.add('focused');}else{currentVideo=null;}}
function deleteSelectedItems(){if(selectedFileNames.length===0){return;}
LazyLoader.load('shared/style/confirm.css',function(){document.body.classList.add('confirm-dialog');Dialogs.confirm({messageId:'delete-n-items?',messageArgs:{n:selectedFileNames.length},cancelId:'cancel',confirmId:'delete',danger:true},function(){for(var i=0;i<selectedFileNames.length;i++){deleteFile(selectedFileNames[i]);}
clearSelection();document.body.classList.remove('confirm-dialog');},function(){document.body.classList.remove('confirm-dialog');});});}
function deleteFile(filename){if(FROMCAMERA.test(filename)){var postername=filename.replace('.3gp','.jpg');navigator.getDeviceStorage('pictures').delete(postername);}
videodb.deleteFile(filename);}
function shareSelectedItems(){var blobs=selectedFileNames.map(function(name){return selectedFileNamesToBlobs[name];});share(blobs);}
function share(blobs){if(blobs.length===0){return;}
var names=[],fullpaths=[];blobs.forEach(function(blob){var name=blob.name;fullpaths.push(name);name=name.substring(name.lastIndexOf('/')+1);names.push(name);});if(playerShowing){releaseVideo();}
var a=new MozActivity({name:'share',data:{type:'video/*',number:blobs.length,blobs:blobs,filenames:names,filepaths:fullpaths}});a.onsuccess=restoreVideo;a.onerror=function(){if(a.error.name==='NO_PROVIDER'){document.l10n.formatValue('share-noprovider').then((msg)=>{alert(msg);});}else{console.warn('share activity error:',a.error.name);}
restoreVideo();};}
function updateDialog(){if(thumbnailList.count!==0&&(!storageState||playerShowing)){showOverlay(null);}else if(storageState===MediaDB.UPGRADING){showOverlay('upgrade');}else if(storageState===MediaDB.NOCARD){showOverlay('nocard');}else if(storageState===MediaDB.UNMOUNTED){showOverlay('pluggedin');}else if(firstScanEnded&&thumbnailList.count===0&&metadataQueue.length===0){showOverlay('empty');}}
function updateLoadingSpinner(){if(processingQueue){noMoreWorkCallback=updateLoadingSpinner;}else{window.performance.mark('scanEnd');dom.spinnerOverlay.classList.add('hidden');setDisabled(dom.playerView,false);if(thumbnailList.count){currentVideo=currentVideo||thumbnailList.itemGroups[0].thumbnails[0].data;if(!isPhone&&!isPortrait){showPlayer(currentVideo,false,false,true);}}}}
function thumbnailClickHandler(videodata){if(!isPhone&&!isPortrait){if(!firstScanEnded||processingQueue){return;}}
if(currentLayoutMode===LAYOUT_MODE.list){hidePlayer(true,function(){stopParsingMetadata(function(){var fullscreen=pendingPick||isPhone||isPortrait;showPlayer(videodata,!pendingPick,fullscreen,pendingPick);});});}
else if(currentLayoutMode===LAYOUT_MODE.selection){updateSelection(videodata);}}
function showOverlay(id){LazyLoader.load('shared/style/confirm.css',function(){currentOverlay=id;if(id===null){document.body.classList.remove('overlay');dom.overlay.classList.add('hidden');return;}
var text,title;if(pendingPick||id==='empty'){dom.overlayMenu.classList.remove('hidden');dom.overlayActionButton.classList.remove('hidden');dom.overlayActionButton.setAttribute('data-l10n-id',pendingPick?'overlay-cancel-button':'overlay-camera-button');}else{dom.overlayMenu.classList.add('hidden');dom.overlayActionButton.classList.add('hidden');}
if(id==='nocard'){title='nocard2-title';text='nocard3-text';}else{title=id+'-title';text=id+'-text';}
dom.overlayTitle.setAttribute('data-l10n-id',title);dom.overlayText.setAttribute('data-l10n-id',text);dom.overlay.classList.remove('hidden');document.body.classList.add('overlay');});}
function setControlsVisibility(visible){if(isPhone||isPortrait||currentLayoutMode!==LAYOUT_MODE.list){dom.playerView.classList[visible?'remove':'add']('video-controls-hidden');controlShowing=visible;}else{controlShowing=true;}
dom.videoContainer.setAttribute('data-l10n-id',controlShowing?'hide-controls-button':'show-controls-button');if(controlShowing){updateVideoControlSlider();}}
function movePlayHead(percent){if(document.documentElement.dir==='ltr'){dom.playHead.style.left=percent;}
else{dom.playHead.style.right=percent;}}
function updateVideoControlSlider(){var percent=(dom.player.currentTime/dom.player.duration)*100;if(isNaN(percent)){return;}
percent+='%';dom.elapsedText.textContent=MediaUtils.formatDuration(dom.player.currentTime);dom.elapsedTime.style.width=percent;if(!dragging){movePlayHead(percent);}}
function setVideoPlaying(playing){if(playing){play();}else{pause();}}
function deleteCurrentVideo(){hideOptionsView();setNFCSharing(false);LazyLoader.load('shared/style/confirm.css',function(){document.body.classList.add('confirm-dialog');Dialogs.confirm({messageId:'delete-video?',cancelId:'cancel',confirmId:'delete',danger:true},function _onSuccess(){deleteFile(currentVideo.name);if(!isPhone&&!isPortrait){if(currentVideo){showPlayer(currentVideo,false,true,true);}}else{hidePlayer(false);}
document.body.classList.remove('confirm-dialog');},function _onError(){setNFCSharing(true);document.body.classList.remove('confirm-dialog');});});}
function handlePlayButtonClick(){setVideoPlaying(dom.player.paused);}
function handleCloseButtonClick(){if(isPhone||isPortrait){hidePlayer(true);}else{toggleFullscreenPlayer();}}
function postPickResult(){pendingPick.postResult({type:currentVideoBlob.type,blob:currentVideoBlob});cleanupPick();}
function shareCurrentVideo(){hideOptionsView();videodb.getFile(currentVideo.name,function(blob){share([blob]);});}
function handleSliderTouchStart(event){if(null!=touchStartID){return;}
touchStartID=event.changedTouches[0].identifier;dragging=true;sliderRect=dom.sliderWrapper.getBoundingClientRect();if(dom.player.duration===Infinity){return;}
handleSliderTouchMove(event);}
function setVideoUrl(player,video,callback){function handleLoadedMetadata(){dom.player.onloadedmetadata=null;callback();}
function loadVideo(url){loadingChecker.ensureVideoLoads(handleLoadedMetadata);player.src=url;}
captions.remove();if('name'in video){videodb.getFile(video.name,function(file){captions.findAndDisplay(file.name);var url=URL.createObjectURL(file);loadVideo(url);if(pendingPick){currentVideoBlob=file;}});}else if('url'in video){loadVideo(video.url);}}
function scheduleVideoControlsAutoHiding(){controlFadeTimeout=setTimeout(function(){setControlsVisibility(false);},250);}
function setNFCSharing(enable){if(!window.navigator.mozNfc){return;}
if(enable){window.navigator.mozNfc.onpeerready=function(event){videodb.getFile(currentVideo.name,function(file){event.peer.sendFile(file);});};}else{window.navigator.mozNfc.onpeerready=null;}}
function showPlayer(video,autoPlay,enterFullscreen,keepControls){if(currentVideo){var old=thumbnailList.thumbnailMap[currentVideo.name];old.htmlNode.classList.remove('focused');}
currentVideo=video;var thumbnail=thumbnailList.thumbnailMap[currentVideo.name];thumbnail.htmlNode.classList.add('focused');updateDialog();dom.player.preload='metadata';function doneSeeking(){dom.player.onseeked=null;setControlsVisibility(true);if(!keepControls){scheduleVideoControlsAutoHiding();}
if(autoPlay){play();}else{pause();}
dom.player.hidden=false;}
dom.player.hidden=true;setVideoUrl(dom.player,currentVideo,function(){if(enterFullscreen){switchLayout(LAYOUT_MODE.fullscreenPlayer);}
var formattedDuration=MediaUtils.formatDuration(dom.player.duration);dom.durationText.textContent=formattedDuration;timeUpdated();setButtonPaused(false);playerShowing=true;var rotation;if('metadata'in currentVideo){if(currentVideo.metadata.currentTime===dom.player.duration){currentVideo.metadata.currentTime=0;}
dom.videoTitle.textContent=currentVideo.metadata.title;dom.player.currentTime=currentVideo.metadata.currentTime||0;rotation=currentVideo.metadata.rotation;}else{dom.videoTitle.textContent=currentVideo.title||'';dom.player.currentTime=0;rotation=0;}
document.l10n.setAttributes(dom.timeSlider,'seek-bar',{duration:formattedDuration});dom.timeSlider.setAttribute('aria-valuemin',0);dom.timeSlider.setAttribute('aria-valuemax',dom.player.duration);dom.timeSlider.setAttribute('aria-valuenow',dom.player.currentTime);dom.timeSlider.setAttribute('aria-valuetext',MediaUtils.formatDuration(dom.player.currentTime));VideoUtils.fitContainer(dom.videoContainer,dom.player,rotation||0);if(dom.player.seeking){dom.player.onseeked=doneSeeking;}else{doneSeeking();}
setNFCSharing(true);});}
function hidePlayer(updateVideoMetadata,callback){if(!playerShowing){if(callback){callback();}
return;}
dom.player.pause();setNFCSharing(false);function completeHidingPlayer(){switchLayout(LAYOUT_MODE.list);setButtonPaused(false);playerShowing=false;updateDialog();captions.remove();dom.player.removeAttribute('src');dom.player.load();startParsingMetadata();if(callback){callback();}}
if(!('metadata'in currentVideo)||!updateVideoMetadata||pendingPick){completeHidingPlayer();return;}
var video=currentVideo;var thumbnail=thumbnailList.thumbnailMap[video.name];if(dom.player.currentTime===0){video.metadata.bookmark=null;updateMetadata();}
else{captureFrame(dom.player,video.metadata,function(bookmark){video.metadata.bookmark=bookmark;updateMetadata();});}
function updateMetadata(){thumbnail.updatePoster(video.metadata.bookmark||video.metadata.poster);if(!video.metadata.watched){video.metadata.watched=true;thumbnail.setWatched(true);}
video.metadata.currentTime=dom.player.currentTime;videodb.updateMetadata(video.name,video.metadata);completeHidingPlayer();}}
function playerEnded(){if(dragging){return;}
if(playing){dom.player.currentTime=0;pause();}}
function setButtonPaused(paused){dom.play.classList.toggle('paused',paused);dom.play.setAttribute('data-l10n-id',paused?'play-button':'pause-button');}
function play(){loadingChecker.ensureVideoPlays();setButtonPaused(false);VideoStats.start(dom.player);dom.player.play();playing=true;}
function pause(){loadingChecker.cancelEnsureVideoPlays();setButtonPaused(true);if(dragging){dragging=false;dom.playHead.classList.remove('active');}
dom.player.pause();playing=false;VideoStats.stop();VideoStats.dump();}
function timeUpdated(){if(controlShowing){if(dom.player.duration===Infinity||dom.player.duration===0){return;}
updateVideoControlSlider();}
dom.timeSlider.setAttribute('aria-valuenow',dom.player.currentTime);dom.timeSlider.setAttribute('aria-valuetext',MediaUtils.formatDuration(dom.player.currentTime));}
function handleSliderTouchEnd(event){if(!event.changedTouches.identifiedTouch(touchStartID)){return;}
touchStartID=null;if(!dragging){return;}
dragging=false;dom.playHead.classList.remove('active');updateVideoControlSlider();if(dom.player.currentTime===dom.player.duration){pause();}}
function handleSliderTouchMove(event){if(!dragging){return;}
var touch=event.changedTouches.identifiedTouch(touchStartID);if(!touch){return;}
function getTouchPos(){return(document.documentElement.dir==='ltr')?(touch.clientX-sliderRect.left):(sliderRect.right-touch.clientX);}
var touchPos=getTouchPos();var pos=touchPos/sliderRect.width;pos=Math.max(pos,0);pos=Math.min(pos,1);var percent=pos*100+'%';dom.playHead.classList.add('active');movePlayHead(percent);dom.elapsedTime.style.width=percent;seeker.seekTo(dom.player.duration*pos);}
function handleSliderKeypress(event){var step=Math.max(dom.player.duration/20,2);if(event.keyCode===event.DOM_VK_DOWN){seeker.seekTo(dom.player.currentTime-step);}else if(event.keyCode===event.DOM_VK_UP){seeker.seekTo(dom.player.currentTime+step);}}
function toCamelCase(str){return str.replace(/\-(.)/g,function replacer(str,p1){return p1.toUpperCase();});}
function showPickView(){thumbnailList.setPickMode(true);document.body.classList.add('pick-activity');dom.pickerHeader.addEventListener('action',cancelPick);if(!isPhone&&!isPortrait){thumbnailList.updateAllThumbnailTitles();}}
function cancelPick(){pendingPick.postError('pick cancelled');cleanupPick();}
function cleanupPick(){pendingPick=null;currentVideoBlob=null;hidePlayer(false);}
function showThrobber(){dom.throbber.classList.remove('hidden');dom.throbber.classList.add('throb');}
function hideThrobber(){dom.throbber.classList.remove('throb');setTimeout(function(){dom.throbber.classList.add('hidden');},100);}
function releaseVideo(){if(videoHardwareReleased){return;}
videoHardwareReleased=true;if(dom.player.readyState>0){restoreTime=dom.player.currentTime;}
else{restoreTime=0;}
captions.remove();dom.player.removeAttribute('src');dom.player.load();}
function restoreVideo(){if(!videoHardwareReleased){return;}
videoHardwareReleased=false;setVideoUrl(dom.player,currentVideo,function(){VideoUtils.fitContainer(dom.videoContainer,dom.player,currentVideo.metadata.rotation||0);dom.player.currentTime=restoreTime;});}
window.addEventListener('storage',function(e){if(e.key==='view-activity-wants-to-use-hardware'&&e.newValue&&!document.hidden&&playerShowing&&!videoHardwareReleased){console.log('The video app view activity needs to play a video.');console.log('Pausing the video and returning to the thumbnails.');console.log('See bug 1088456.');handleCloseButtonClick();}});