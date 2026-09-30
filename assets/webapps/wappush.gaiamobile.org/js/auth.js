;'use strict';var ProvisioningAuthentication=(function(){var pin=null;var auth=null;function pa_isDocumentValid(userPin,authInfo){pin=userPin;auth=authInfo;var sec=auth.sec;switch(sec){case'NETWPIN':throw new Error('cp-finish-confirm-dialog-message-auth-error');case'USERPIN':return pa_userPinAuthentication();case'USERNETWPIN':return pa_userNetwPinAuthentication();case'USERPINMAC':return pa_userPinMacAuthentication();default:throw new Error('cp-finish-confirm-dialog-message-auth-unsupported-mechanism');}}
function pa_userPinAuthentication(){var mac=auth.mac;return mac===pa_sign(pin,auth.data,auth.data.length);}
function pa_userNetwPinAuthentication(){throw new Error('cp-finish-confirm-dialog-message-auth-unsupported-mechanism');}
function pa_userPinMacAuthentication(){throw new Error('cp-finish-confirm-dialog-message-auth-unsupported-mechanism');}
function pa_sign(key,data,dataLength){function bin2hex(buffer){var i,f=0,a=[],data=new Uint8Array(buffer);f=data.length;for(i=0;i<f;i++){a[i]=data[i].toString(16).replace(/^([\da-f])$/,'0$1');}
return a.join('');}
var _data=new Uint8Array(dataLength);for(var i=0;i<dataLength;i++){_data[i]=data[i];}
var hmac=CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA1,key);var words=CryptoJS.enc.Hex.parse(bin2hex(_data));hmac.update(words);var hash=hmac.finalize();return hash.toString(CryptoJS.enc.Hex).toUpperCase();}
return{isDocumentValid:pa_isDocumentValid};})();