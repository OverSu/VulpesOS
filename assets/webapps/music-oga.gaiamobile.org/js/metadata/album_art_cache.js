;'use strict';var AlbumArtCache=(function(){var THUMBNAIL_WIDTH=300;var THUMBNAIL_HEIGHT=300;var L1Cache={'thumbnail':{},'fullsize':{}};function getFullSizeURL(fileinfo,noPlaceholder){if(!fileinfo.metadata.picture){return Promise.resolve(noPlaceholder?null:getDefaultCoverURL(fileinfo));}
var cacheKey=makeCacheKey(fileinfo);if(cacheKey&&cacheKey in L1Cache.fullsize){return Promise.resolve(L1Cache.fullsize[cacheKey]);}
return getAlbumArtBlob(fileinfo).then(function(blob){return makeAndCacheURL(cacheKey,blob,'fullsize');});}
function getFullSizeBlob(fileinfo,noPlaceholder){if(!fileinfo.metadata.picture){if(noPlaceholder){return Promise.resolve(null);}
return getBlobFromURL(getDefaultCoverURL(fileinfo));}
return getAlbumArtBlob(fileinfo);}
function getThumbnailURL(fileinfo,noPlaceholder){if(!fileinfo.metadata.picture){return Promise.resolve(noPlaceholder?null:getDefaultCoverURL(fileinfo));}
var cacheKey=makeCacheKey(fileinfo);if(cacheKey&&cacheKey in L1Cache.thumbnail){return Promise.resolve(L1Cache.thumbnail[cacheKey]);}
return checkL2Cache(cacheKey).then(function(cachedBlob){return cachedBlob||createThumbnail(cacheKey,fileinfo);}).then(function(blob){return makeAndCacheURL(cacheKey,blob,'thumbnail');});}
function getThumbnailBlob(fileinfo,noPlaceholder){if(!fileinfo.metadata.picture){if(noPlaceholder){return Promise.resolve(null);}
return getBlobFromURL(getDefaultCoverURL(fileinfo));}
var cacheKey=makeCacheKey(fileinfo);return checkL2Cache(cacheKey).then(function(cachedBlob){return cachedBlob||createThumbnail(cacheKey,fileinfo);});}
function getDefaultCoverURL(fileinfo){var metadata=fileinfo.metadata;var infoForHash=(!metadata.album&&!metadata.artist)?metadata.title:metadata.album+metadata.artist;var hashedNumber=(Math.abs(hash(infoForHash))%10)+1;return'/style/images/AlbumArt'+hashedNumber+'_small.png';}
function hash(str){var hashCode=0;if(str.length===0){return hashCode;}
for(var i=0;i<str.length;i++){var c=str.charCodeAt(i);hashCode=((hashCode<<5)-hashCode)+c;hashCode=hashCode&hashCode;}
return hashCode;}
function makeCacheKey(fileinfo){var metadata=fileinfo.metadata;if(metadata.picture.filename){return'external.'+metadata.picture.filename;}else if(metadata.picture.flavor==='embedded'){var album=metadata.album;var artist=metadata.artist;var size=metadata.picture.end-metadata.picture.start;if(album||artist){return'thumbnail.'+album+'.'+artist+'.'+size;}else{return'thumbnail.'+(fileinfo.name||fileinfo.blob.name);}}
return null;}
function checkL2Cache(cacheKey){if(!cacheKey){return Promise.resolve(null);}else{return new Promise(function(resolve,reject){asyncStorage.getItem(cacheKey,function(blob){resolve(blob);});});}}
function makeAndCacheURL(cacheKey,blob,type){var url=URL.createObjectURL(blob);if(cacheKey){L1Cache[type][cacheKey]=url;}
return url;}
function createThumbnail(cacheKey,fileinfo){return getAlbumArtBlob(fileinfo).then(function(blob){return ImageUtils.resizeAndCropToCover(blob,THUMBNAIL_WIDTH,THUMBNAIL_HEIGHT);}).then(function(thumbnailBlob){if(cacheKey){asyncStorage.setItem(cacheKey,thumbnailBlob);}
return thumbnailBlob;});}
function getAlbumArtBlob(fileinfo){var picture=fileinfo.metadata.picture;if(picture.blob){return Promise.resolve(picture.blob);}else if(picture.filename){return LazyLoader.load('/js/metadata/album_art.js').then(()=>{return new Promise((resolve,reject)=>{var getreq=AlbumArt.pictureStorage.get(picture.filename);getreq.onsuccess=function(){resolve(this.result);};getreq.onerror=function(){reject(this.error);};});});}else if(picture.start){return getSongBlob(fileinfo).then((blob)=>{return blob.slice(picture.start,picture.end,picture.type);});}else{var err=new Error('unknown picture flavor: '+picture.flavor);console.error(err);return Promise.reject(err);}}
function getSongBlob(fileinfo){if(fileinfo.blob){return Promise.resolve(fileinfo.blob);}else{return Database.getFile(fileinfo);}}
function getBlobFromURL(url){return new Promise(function(resolve,reject){var xhr=new XMLHttpRequest();xhr.open('GET',url,true);xhr.responseType='blob';xhr.onload=function(){resolve(xhr.response);};xhr.onerror=function(){reject(null);};xhr.send();});}
return{getFullSizeURL:getFullSizeURL,getFullSizeBlob:getFullSizeBlob,getThumbnailURL:getThumbnailURL,getThumbnailBlob:getThumbnailBlob};})();