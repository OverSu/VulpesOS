;'use strict';(function init(){var activity;var activityData;var blob;var frame;var saved=false;var storage;var title;navigator.mozSetMessageHandler('activity',handleOpenActivity);function $(id){return document.getElementById(id);}
function open(blob){if(activityData.allowSave&&activityData.filename&&checkFilename()){getStorageIfAvailable('pictures',blob.size,function(ds){storage=ds;showSaveButton();});}
getImageSize(blob,success,error);function success(metadata){var pixels=metadata.width*metadata.height;var imagesizelimit=CONFIG_MAX_IMAGE_PIXEL_SIZE;if(blob.type==='image/jpeg'){imagesizelimit*=Downsample.MAX_AREA_REDUCTION;}
var filesizelimit=2*CONFIG_MAX_IMAGE_PIXEL_SIZE;if(pixels>imagesizelimit||blob.size>filesizelimit){displayError('imagetoobig');return;}
if(!metadata.preview||pixels<512*1024){frame.displayImage(blob,metadata.width,metadata.height,null,metadata.rotation,metadata.mirrored);}
else{parseJPEGMetadata(blob.slice(metadata.preview.start,metadata.preview.end,'image/jpeg'),function success(previewmetadata){metadata.preview.width=previewmetadata.width;metadata.preview.height=previewmetadata.height;frame.displayImage(blob,metadata.width,metadata.height,metadata.preview,metadata.rotation,metadata.mirrored);},function error(){frame.displayImage(blob,metadata.width,metadata.height,null,metadata.rotation,metadata.mirrored);});}}
function error(msg){displayError('imageinvalid');}}
function handleOpenActivity(request){activity=request;activityData=activity.source.data;if(!frame){$('header').addEventListener('action',done);$('save').addEventListener('click',save);frame=new MediaFrame($('frame'),false,CONFIG_MAX_IMAGE_PIXEL_SIZE);if(CONFIG_REQUIRED_EXIF_PREVIEW_WIDTH){frame.setMinimumPreviewSize(CONFIG_REQUIRED_EXIF_PREVIEW_WIDTH,CONFIG_REQUIRED_EXIF_PREVIEW_HEIGHT);}
var gestureDetector=new GestureDetector(frame.container);gestureDetector.startDetecting();frame.container.addEventListener('dbltap',handleDoubleTap);frame.container.addEventListener('transform',handleTransform);frame.container.addEventListener('pan',handlePan);frame.container.addEventListener('swipe',handleSwipe);window.addEventListener('resize',frame.resize.bind(frame));if(activityData.exitWhenHidden){window.addEventListener('visibilitychange',function(){if(document.hidden){done();}});}
frame.onerror=function invalid(){displayError('imageinvalid');};}
title=baseName(activityData.filename||'');$('filename').textContent=title;blob=activityData.blob;open(blob);NFC.share(blob,{foregroundElement:$('open'),backgroundElement:document.body});}
function checkFilename(){if(activityData.filename.indexOf('.gallery/')!=-1){return false;}
else{var dotIdx=activityData.filename.lastIndexOf('.');if(dotIdx>-1){var ext=activityData.filename.substr(dotIdx+1);return MimeMapper.guessTypeFromExtension(ext)===blob.type;}else{return false;}}}
function displayError(msgid){document.l10n.formatValue(msgid).then(function(val){alert(val);done();});}
function done(){activity.postResult({saved:saved});activity=null;NFC.unshare();}
function handleDoubleTap(e){var scale;if(frame.fit.scale>frame.fit.baseScale){scale=frame.fit.baseScale/frame.fit.scale;}else{scale=2;}
frame.zoom(scale,e.detail.clientX,e.detail.clientY,200);}
function handleTransform(e){frame.zoom(e.detail.relative.scale,e.detail.midpoint.clientX,e.detail.midpoint.clientY);}
function handlePan(e){frame.pan(e.detail.relative.dx,e.detail.relative.dy);}
function handleSwipe(e){var direction=e.detail.direction;var velocity=e.detail.vy;if(direction==='down'&&velocity>2){done();}}
function save(){hideSaveButton();getUnusedFilename(storage,activityData.filename,function(filename){var savereq=storage.addNamed(blob,filename);savereq.onsuccess=function(){saved=filename;showBanner('saved',title);};savereq.onerror=function(e){console.error('Error saving',filename,e);};});}
function showSaveButton(){$('save').classList.remove('hidden');$('filename').textContent=$('filename').textContent;}
function hideSaveButton(){$('save').classList.add('hidden');$('filename').textContent=$('filename').textContent;}
function showBanner(msg,title){document.l10n.setAttributes($('message'),msg,{filename:title});$('banner').hidden=false;setTimeout(function(){$('banner').hidden=true;},3000);}
function baseName(filename){return filename.substring(filename.lastIndexOf('/')+1);}})();