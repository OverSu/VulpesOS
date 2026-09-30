;'use strict';function initDB(){videodb=new MediaDB('videos',null,{excludeFilter:/DCIM\/\d{3}MZLLA\/\.VID_\d{4}\.3gp$/});videodb.onupgrading=function(evt){storageState=MediaDB.UPGRADING;updateDialog();};videodb.onunavailable=function(event){storageState=event.detail;if(playerShowing){hidePlayer(true);}
updateDialog();};videodb.oncardremoved=function(){if(playerShowing){hidePlayer(true);}};videodb.onscanend=function(){if(!firstScanEnded){firstScanEnded=true;window.performance.mark('fullyLoaded');}
updateDialog();updateLoadingSpinner();};videodb.oncreated=function(event){event.detail.forEach(videoCreated);};videodb.ondeleted=function(event){event.detail.forEach(videoDeleted);};videodb.onenumerable=function(){storageState=false;updateDialog();enumerateDB();};videodb.onready=function(){storageState=false;updateDialog();startParsingMetadata();};}
var enumerated=false;function enumerateDB(){if(enumerated){return;}
enumerated=true;var firstBatchDisplayed=false;var batch=[];var batchSize=4;videodb.enumerate('date',null,'prev',function(videoinfo){if(videoinfo===null){flush();return;}
var isVideo=videoinfo.metadata.isVideo;if(isVideo===false){return;}
if(isVideo===undefined){addToMetadataQueue(videoinfo);return;}
if(isVideo===true){batch.push(videoinfo);if(batch.length>=batchSize){flush();batchSize*=2;}}});function flush(){batch.forEach(addVideo);batch.length=0;if(!firstBatchDisplayed){firstBatchDisplayed=true;window.performance.mark('visuallyLoaded');window.performance.mark('contentInteractive');setTimeout(function(){var headers=document.querySelectorAll('gaia-header');for(var i=0;i<headers.length;++i){headers[i].removeAttribute('no-font-fit');}});}}}
function addVideo(videodata){if(!videodata||!videodata.metadata.isVideo){return;}
var view=thumbnailList.addItem(videodata);view.addTapListener(thumbnailClickHandler);view.updateTitleText();if(thumbnailList.count===1){updateDialog();}}
function videoCreated(videoinfo){addToMetadataQueue(videoinfo);}
function videoDeleted(filename){if(currentVideo&&filename===currentVideo.name){resetCurrentVideo();}
thumbnailList.removeItem(filename);if(thumbnailList.count===0){updateDialog();hideSelectView();}}