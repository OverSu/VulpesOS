;'use strict';var TRANSITION_FRACTION=0.25;var TRANSITION_SPEED=0.75;var thumbnails;var thumbnailList;var fullscreenView=$('fullscreen-view');const LAYOUT_MODE={list:'thumbnailListView',select:'thumbnailSelectView',fullscreen:'fullscreenView',edit:'editView',pick:'pickView',crop:'cropView'};var currentView;ScreenLayout.watch('portrait','(orientation: portrait)');var isPortrait=ScreenLayout.getCurrentLayout('portrait');var isPhone=ScreenLayout.getCurrentLayout('tiny');var fullscreenButtonIds=['back','delete','edit','share','camera','info'];var fullscreenButtons={};for(var i=0;i<fullscreenButtonIds.length;i++){var selector='fullscreen-'+fullscreenButtonIds[i]+'-button';selector+=(isPhone?'-tiny':'-large');fullscreenButtons[fullscreenButtonIds[i]]=document.getElementById(selector);}
var currentFileIndex=0;var editedPhotoIndex;var selectedFileNames=[];var selectedFileNamesToBlobs={};var videostorage=navigator.getDeviceStorage('videos');var justSavedEditedImage=false;function getVideoFile(filename,callback){var req=videostorage.get(filename);req.onsuccess=function(){callback(req.result);};req.onerror=function(){console.error('Failed to get video file',filename);};}
function getCurrentFile(){return new Promise(function(resolve,reject){var fileInfo=files[currentFileIndex];if(fileInfo.metadata.video){getVideoFile(fileInfo.metadata.video,function(file){resolve(file);});}else{photodb.getFile(fileInfo.name,function(file){resolve(file);},function(errmsg){reject(errmsg);});}});}
function compareFilesByDate(a,b){if(a.date<b.date){return 1;}else if(a.date>b.date){return-1;}
return 0;}
function getFileIndex(filename){var fileGroup=thumbnailList.groupMap[filename];if(!fileGroup){console.error('file group does not exist in thumbnail List',filename);return-1;}
var index=0;var thumbnail=thumbnailList.thumbnailMap[filename];index=fileGroup.thumbnails.indexOf(thumbnail);if(index<0){console.error('filename does not exist in thumbnail list',filename);return-1;}
for(var n=0;n<thumbnailList.itemGroups.length;n++){if(thumbnailList.itemGroups[n].groupID===fileGroup.groupID){break;}
index+=thumbnailList.itemGroups[n].getCount();}
return index;}
function fileDeleted(filename){var fileIndex=currentFileIndex;for(var n=0;n<files.length;n++){if(files[n].name===filename){break;}}
if(n>=files.length){return;}
files.splice(n,1)[0];thumbnailList.removeItem(filename);if(n<fileIndex){fileIndex--;}
if(fileIndex>=files.length){fileIndex=files.length-1;}
if(n<editedPhotoIndex){editedPhotoIndex--;}
if(files.length>0&&(currentView===LAYOUT_MODE.fullscreen)){showFile(fileIndex);}else{updateFocusThumbnail(fileIndex);}
if(files.length===0){if(currentView!==LAYOUT_MODE.pick){setView(LAYOUT_MODE.list);}
Overlay.show('emptygallery');}}
function deleteFile(n){if(n<0||n>=files.length){return;}
var fileinfo=files[n];photodb.deleteFile(files[n].name);if(fileinfo.metadata.video){videostorage.delete(fileinfo.metadata.video);}
if(fileinfo.metadata.preview&&fileinfo.metadata.preview.filename){var pictures=navigator.getDeviceStorage('pictures');pictures.delete(fileinfo.metadata.preview.filename);}}
function fileCreated(fileinfo){if(picking&&fileinfo.metadata.video){return;}
photodb.getFileInfo(fileinfo.name,function(fileinfo){var insertPosition;if(Overlay.current==='emptygallery'||Overlay.current==='scanning'){Overlay.hide();}
thumbnailList.addItem(fileinfo);insertPosition=getFileIndex(fileinfo.name);if(insertPosition<0){return;}
files.splice(insertPosition,0,fileinfo);if(currentFileIndex>=insertPosition){currentFileIndex++;}
if(editedPhotoIndex>=insertPosition){editedPhotoIndex++;}
if(currentView===LAYOUT_MODE.fullscreen){if(justSavedEditedImage){var banner=$('edit-copy-save-banner');showFile(insertPosition);document.l10n.setAttributes($('edit-copy-save-status'),'edit-copy-saved');banner.hidden=false;setTimeout(function(){banner.hidden=true;},3000);}else{showFile(currentFileIndex);}}
justSavedEditedImage=false;});}
function scrollToShowThumbnail(n){if(!files[n]){return;}
var selector='img[data-filename="'+files[n].name+'"]';var thumbnail=thumbnails.querySelector(selector);if(thumbnail){var screenTop=thumbnails.scrollTop;var screenBottom=screenTop+thumbnails.clientHeight;var thumbnailTop=thumbnail.offsetTop;var thumbnailBottom=thumbnailTop+thumbnail.offsetHeight;var toolbarHeight=40;screenBottom-=toolbarHeight;if(thumbnailTop<screenTop){thumbnails.scrollTop=thumbnailTop;}
else if(thumbnailBottom>screenBottom){thumbnails.scrollTop=thumbnailBottom-thumbnails.clientHeight+toolbarHeight;}}}
function setView(view){if(currentView===view){return;}
document.body.classList.remove(currentView);document.body.classList.add(view);switch(currentView){case LAYOUT_MODE.select:Array.forEach(thumbnails.querySelectorAll('.selected.thumbnailImage'),function(elt){elt.classList.remove('selected');});if(!isPhone&&currentFileIndex!==-1){showFile(currentFileIndex);}
break;case LAYOUT_MODE.fullscreen:if(!isPhone&&(view===LAYOUT_MODE.list)&&!isPortrait&&currentFileIndex!==-1){resizeFrames();}else{clearFrames();}
break;}
switch(view){case LAYOUT_MODE.list:scrollToShowThumbnail(currentFileIndex);if(currentView===LAYOUT_MODE.fullscreen){NFC.unshare();}
break;case LAYOUT_MODE.fullscreen:resizeFrames();NFC.share(getCurrentFile);break;case LAYOUT_MODE.select:clearSelection();if(!isPhone&&currentFrame.video&&!isPortrait){currentFrame.video.pause();}
break;case LAYOUT_MODE.edit:NFC.unshare();break;}
if(!isPhone){if(view!==LAYOUT_MODE.fullscreen){$('fullscreen-title').setAttribute('data-l10n-id','preview');}else{$('fullscreen-title').setAttribute('data-l10n-id','gallery');}}
currentView=view;}
function thumbnailClickHandler(evt){var target=evt.target;if(!target){return;}
target=target.classList.contains('thumbnail')?target.firstElementChild:target;if(!target||!target.classList.contains('thumbnailImage')){return;}
if(photodb.state!==MediaDB.READY){return;}
var index=getFileIndex(target.dataset.filename);if(picking&&currentView===LAYOUT_MODE.pick&&index>=0){Pick.select(files[index]);}else if(currentView===LAYOUT_MODE.select){updateSelection(target);}else{LazyLoader.load('js/frame_scripts.js',function(){if(isPortrait||isPhone){setView(LAYOUT_MODE.fullscreen);}
showFile(index);});}}
function updateFocusThumbnail(n){var previousIndex=currentFileIndex;currentFileIndex=n;if(isPhone||currentFileIndex===-1){return;}
var newTarget=thumbnailList.thumbnailMap[files[currentFileIndex].name];if(newTarget){newTarget.htmlNode.classList.add('focus');}
if(previousIndex===currentFileIndex){return;}
var oldTarget=files[previousIndex]?thumbnailList.thumbnailMap[files[previousIndex].name]:undefined;if(oldTarget){oldTarget.htmlNode.classList.remove('focus');}}
function clearSelection(){if(!isPhone){clearFrames();}
selectedFileNames=[];selectedFileNamesToBlobs={};$('thumbnails-delete-button').classList.add('disabled');$('thumbnails-share-button').classList.add('disabled');document.l10n.setAttributes($('thumbnails-number-selected'),'number-selected2',{n:0});}
function updateSelection(thumbnail){thumbnail.classList.toggle('selected');var selected=thumbnail.classList.contains('selected');var index=getFileIndex(thumbnail.dataset.filename);if(index<0){return;}
var filename=files[index].name;if(selected){selectedFileNames.push(filename);updateFocusThumbnail(index);if(files[index].metadata.video){getVideoFile(files[index].metadata.video,function(file){selectedFileNamesToBlobs[filename]=file;});}
else{photodb.getFile(filename,function(file){selectedFileNamesToBlobs[filename]=file;});}
if(!isPhone){showFile(currentFileIndex);}}
else{delete selectedFileNamesToBlobs[filename];var i=selectedFileNames.indexOf(filename);if(i!==-1){selectedFileNames.splice(i,1);}
if(currentFileIndex===index&&!isPhone){if(i>0){var lastSelected=selectedFileNames[i-1];var lastSelectedIndex=getFileIndex(lastSelected);updateFocusThumbnail(lastSelectedIndex);showFile(currentFileIndex);}else{clearFrames();}}}
var numSelected=selectedFileNames.length;document.l10n.setAttributes($('thumbnails-number-selected'),'number-selected2',{n:numSelected});if(numSelected===0){$('thumbnails-delete-button').classList.add('disabled');$('thumbnails-share-button').classList.add('disabled');}
else{$('thumbnails-delete-button').classList.remove('disabled');$('thumbnails-share-button').classList.remove('disabled');}}
function launchCameraApp(){fullscreenButtons.camera.classList.add('disabled');$('thumbnails-camera-button').classList.add('disabled');$('overlay-camera-button').classList.add('disabled');var a=new MozActivity({name:'record',data:{type:'photos'}});a.onsuccess=()=>{};window.setTimeout(function(){fullscreenButtons.camera.classList.remove('disabled');$('thumbnails-camera-button').classList.remove('disabled');$('overlay-camera-button').classList.remove('disabled');},2000);}
function deleteSelectedItems(){var selected=thumbnails.querySelectorAll('.selected.thumbnailImage');if(selected.length===0){return;}
Dialogs.confirm({messageId:'delete-n-items?',messageArgs:{n:selected.length},cancelId:'cancel',confirmId:'delete',danger:true,bodyClass:'showing-dialog'},function(){for(var i=0;i<selected.length;i++){selected[i].classList.toggle('selected');deleteFile(getFileIndex(selected[i].dataset.filename));}
clearSelection();});}
function shareSelectedItems(){var blobs=selectedFileNames.map(function(name){return selectedFileNamesToBlobs[name];});share(blobs);}
function share(blobs,blobName){if(blobs.length===0){return;}
var names=[],types=[],fullpaths=[];blobs.forEach(function(blob){var name=blob.name;if(!name&&blobs.length===1){name=blobName;}
fullpaths.push(name);name=name.substring(name.lastIndexOf('/')+1);names.push(name);var type=blob.type;if(type){type=type.substring(0,type.indexOf('/'));}
types.push(type);});var type;if(types.length===1||types.every(function(t){return t===types[0];})){type=types[0]+'/*';}else{type='application/*';}
var a=new MozActivity({name:'share',data:{type:type,number:blobs.length,blobs:blobs,filenames:names,filepaths:fullpaths}});a.onerror=function(e){if(a.error.name==='NO_PROVIDER'){document.l10n.formatValue('share-noprovider').then(alert);}
else{console.warn('share activity error:',a.error.name);}};}
function resizeHandler(){isPortrait=ScreenLayout.getCurrentLayout('portrait');if(currentView===LAYOUT_MODE.list&&isPortrait&&typeof currentFrame!=='undefined'&&currentFrame.video){currentFrame.video.pause();}
if(currentView===LAYOUT_MODE.fullscreen||(!isPhone&&!isPortrait&&(currentView===LAYOUT_MODE.list||currentView===LAYOUT_MODE.select))){resizeFrames();setFramesPosition();}}
function doNotScanInBackgroundHack(photodb){const enoughMB=512;var memoryMB=0;window.addEventListener('visibilitychange',backgroundScanKiller);photodb.addEventListener('scanend',function(){window.removeEventListener('visibilitychange',backgroundScanKiller);});function backgroundScanKiller(){if(!document.hidden||memoryMB>=enoughMB){return;}
if(!navigator.getFeature){exit();}
else{navigator.getFeature('hardware.memory').then(function(mem){memoryMB=mem;if(memoryMB<enoughMB){exit();}});}
function exit(){if(document.hidden&&photodb.scanning){console.warn('[Gallery] exiting to avoid background scan.');setTimeout(function(){if(document.hidden){window.close();}
else{console.warn('[Gallery] now visible again, so not exiting');}},500);}}}}