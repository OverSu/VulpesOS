
(function(exports){if(exports.ForwardLock){return;}
const mimeSubtype='vnd.mozilla.oma.drm.fl';const SECRET_SETTINGS_ID='oma.drm.forward_lock.secret.key';var secret=null;function xor(buffer,key){var words=new Uint32Array(buffer,0,buffer.byteLength>>2);for(var i=0,n=words.length;i<n;i++){words[i]^=key;}}
function lockBuffer(secret,content,type,metadata){var header='LOCKED 1 '+escape(type)+'\n';if(metadata){for(var p in metadata){header+=escape(p)+':'+escape(metadata[p])+'\n';}}
header+='\0';var buffer=new Uint8Array(new Uint8Array(content)).buffer;xor(buffer,secret);return new Blob([header,buffer],{type:type.split('/')[0]+'/'+mimeSubtype});}
function lockBlob(secret,blob,metadata,callback){var reader=new FileReader();reader.readAsArrayBuffer(blob);reader.onload=function(){callback(lockBuffer(secret,reader.result,blob.type,metadata));};}
function unlockBlob(secret,blob,callback,errorCallback){if(!secret){return error('no secret supplied');}
var reader=new FileReader();reader.readAsArrayBuffer(blob);reader.onload=function(){var buffer=reader.result;var bytes=new Uint8Array(buffer);var header='';var contentStart;for(var i=0;i<bytes.length;i++){if(bytes[i]===0){contentStart=i+1;break;}
header+=String.fromCharCode(bytes[i]);}
if(!header.startsWith('LOCKED')){return error('Bad magic number');}
if(header.substring(6,9)!==' 1 '){return error('Unsupported version number');}
if(!contentStart){return error('No content');}
var eol=header.indexOf('\n');if(eol===-1){return error('malformed header');}
var type=unescape(header.substring(9,eol).trim());var metadata={};var lines=header.substring(eol+1).split('\n');for(var j=0;j<lines.length;j++){var line=lines[j];if(!line){continue;}
var[key,value]=line.split(':');if(!key||!value){return error('malformed metadata');}
metadata[unescape(key)]=unescape(value);}
var content=buffer.slice(contentStart);xor(content,secret);var blob=new Blob([content],{type:type});try{callback(blob,metadata);}
catch(e){console.error('Exception in content callback',e);}};function error(msg){msg='LCKA.decrypt(): '+msg;if(errorCallback){try{errorCallback(msg);}
catch(e){console.error('Exception in error callback',e);}}
else{console.error(msg);}}}
function getKey(callback){try{if(secret!==null){report(secret);return;}
var lock=navigator.mozSettings.createLock();var getreq=lock.get(SECRET_SETTINGS_ID);getreq.onsuccess=function(){secret=getreq.result[SECRET_SETTINGS_ID]||null;report(secret);};getreq.onerror=function(){console.error('Error getting ForwardLock setting',getreq.error);report(null);};}
catch(e){console.error('Exception in ForwardLock.getKey():',e);report(null);}
function report(secret){if(callback){try{callback(secret);}
catch(e){console.error('Exception in ForwardLock.getKey() callback',e);}}}}
function getOrCreateKey(callback){getKey(function(key){if(key!==null){report(key);return;}
secret=((Math.random()*0xFFFFFFFF)|0)+1;var setting={};setting[SECRET_SETTINGS_ID]=secret;var setreq=navigator.mozSettings.createLock().set(setting);setreq.onsuccess=function(){report(secret);};setreq.onerror=function(){console.error('Failed to set key in ForwardLock.getOrCreateKey()',setreq.error.name);secret=null;};});function report(secret){if(callback){try{callback(secret);}
catch(e){console.error('Exception in ForwardLock.getOrCreateKey() callback');}}}}
exports.ForwardLock={lockBuffer:lockBuffer,lockBlob:lockBlob,unlockBlob:unlockBlob,mimeSubtype:mimeSubtype,getKey:getKey,getOrCreateKey:getOrCreateKey};}(window));