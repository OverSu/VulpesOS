;'use strict';var metadataQueue=[];var processingQueue=false;var stopParsingMetadataCallback=null;var noMoreWorkCallback=null;function addToMetadataQueue(fileinfo){metadataQueue.push(fileinfo);startParsingMetadata();}
function startParsingMetadata(){if(processingQueue){return;}
if(metadataQueue.length===0){if(noMoreWorkCallback){noMoreWorkCallback();noMoreWorkCallback=null;}
return;}
if(document.hidden||playerShowing){return;}
if(videodb.state!==MediaDB.READY){return;}
processingQueue=true;showThrobber();processFirstQueuedItem();}
function stopParsingMetadata(callback){if(!processingQueue){if(callback){callback();}
return;}
stopParsingMetadataCallback=callback||true;}
function processFirstQueuedItem(){if(stopParsingMetadataCallback){var callback=stopParsingMetadataCallback;stopParsingMetadataCallback=null;processingQueue=false;hideThrobber();if(callback!==true){callback();}
return;}
if(metadataQueue.length===0){processingQueue=false;hideThrobber();updateDialog();if(typeof(noMoreWorkCallback)==='function'){noMoreWorkCallback();}
return;}
var fileinfo=metadataQueue.shift();videodb.getFile(fileinfo.name,function(file){getMetadata(file,function(metadata){fileinfo.metadata=metadata;videodb.updateMetadata(fileinfo.name,metadata,function(){if(metadata.isVideo){videodb.getFileInfo(fileinfo.name,function(dbfileinfo){addVideo(dbfileinfo);});}});setTimeout(processFirstQueuedItem);});},function(err){console.error('getFile error: ',fileinfo.name,err);processFirstQueuedItem();});}
function getMetadata(videofile,callback){var offscreenVideo=document.createElement('video');var metadata={};if(!offscreenVideo.canPlayType(videofile.type)){metadata.isVideo=false;callback(metadata);return;}
var url=URL.createObjectURL(videofile);offscreenVideo.preload='metadata';offscreenVideo.src=url;const METADATA_TIMEOUT=3000;var timeoutId=setTimeout(function(){console.error('No loadedmetadata or error events seen yet.','Assuming video file is corrupt:',videofile.name);offscreenVideo.onerror();},METADATA_TIMEOUT);offscreenVideo.onerror=function(e){console.error('Can\'t play video',videofile.name,e);metadata.isVideo=false;clearTimeout(timeoutId);unload();callback(metadata);};offscreenVideo.onloadedmetadata=function(){clearTimeout(timeoutId);if(!offscreenVideo.videoWidth){metadata.isVideo=false;unload();callback(metadata);return;}
metadata.isVideo=true;metadata.title=readFromMetadata('title')||fileNameToVideoName(videofile.name);metadata.duration=offscreenVideo.duration;metadata.width=offscreenVideo.videoWidth;metadata.height=offscreenVideo.videoHeight;if(/.3gp$/.test(videofile.name)){getVideoRotation(videofile,function(rotation){if(typeof rotation==='number'){metadata.rotation=rotation;}
else if(typeof rotation==='string'){console.warn('Video rotation:',rotation);}
createThumbnail();});}else{metadata.rotation=0;createThumbnail();}};function readFromMetadata(lowerCaseKey){var tags=offscreenVideo.mozGetMetadata();for(var key in tags){if(key.toLowerCase()===lowerCaseKey){return tags[key];}}
return;}
function createThumbnail(){var t=Math.min(5,offscreenVideo.duration/10);offscreenVideo.fastSeek(t);var failed=false;var timeout=setTimeout(fail,10000);offscreenVideo.onerror=fail;function fail(){console.warn('Seek failed while creating thumbnail for',videofile.name,'. Ignoring corrupt file.');failed=true;clearTimeout(timeout);offscreenVideo.onerror=null;metadata.isVideo=false;unload();callback(metadata);}
offscreenVideo.onseeked=function(){if(failed){return;}
clearTimeout(timeout);captureFrame(offscreenVideo,metadata,function(poster){metadata.poster=poster;unload();callback(metadata);});};}
function unload(){URL.revokeObjectURL(offscreenVideo.src);offscreenVideo.removeAttribute('src');offscreenVideo.load();}
function fileNameToVideoName(filename){filename=filename.split('/').pop().replace(/\.(webm|ogv|ogg|mp4|3gp)$/,'').replace(/[_\.]/g,' ');return filename.charAt(0).toUpperCase()+filename.slice(1);}}
function captureFrame(player,metadata,callback){try{var canvas=document.createElement('canvas');canvas.width=THUMBNAIL_WIDTH;canvas.height=THUMBNAIL_HEIGHT;var ctx=canvas.getContext('2d',{willReadFrequently:true});var vw=player.videoWidth,vh=player.videoHeight;var tw,th;switch(metadata.rotation){case 90:ctx.translate(THUMBNAIL_WIDTH,0);ctx.rotate(Math.PI/2);tw=THUMBNAIL_HEIGHT;th=THUMBNAIL_WIDTH;break;case 180:ctx.translate(THUMBNAIL_WIDTH,THUMBNAIL_HEIGHT);ctx.rotate(Math.PI);tw=THUMBNAIL_WIDTH;th=THUMBNAIL_HEIGHT;break;case 270:ctx.translate(0,THUMBNAIL_HEIGHT);ctx.rotate(-Math.PI/2);tw=THUMBNAIL_HEIGHT;th=THUMBNAIL_WIDTH;break;default:tw=THUMBNAIL_WIDTH;th=THUMBNAIL_HEIGHT;break;}
var scale=Math.min(tw/vw,th/vh),w=scale*vw,h=scale*vh,x=(tw-w)/2/scale,y=(th-h)/2/scale;ctx.scale(scale,scale);ctx.drawImage(player,x,y);canvas.toBlob(done,'image/jpeg');}
catch(e){console.error('Exception in captureFrame:',e,e.stack);done(null);}
function done(blob){canvas.width=0;ctx=canvas=null;callback(blob);}}