;;'use strict';var fb=window.fb||{};if(typeof window.oauth2==='undefined'){(function(document){var oauth2=window.oauth2={};var accessTokenCbData;var STORAGE_KEY='tokenData';var APP_ORIGIN=location.origin;function clearStorage(service){ImportStatusData.remove(getKey(service));}
function getKey(service){var key=STORAGE_KEY;if(service!=='facebook'){key=STORAGE_KEY+'_'+service;}
return key;}
oauth2.getAccessToken=function(ready,state,service){accessTokenCbData={callback:ready,state:state,service:service};fb.testToken=fb.testToken||(parent.fb&&parent.fb.testToken);if(service==='facebook'&&typeof fb.testToken==='string'&&fb.testToken.trim().length>0){window.console.warn('Facebook. A test token will be used!');tokenDataReady({data:{access_token:fb.testToken,expires_in:0,state:state}});return;}
ImportStatusData.get(getKey(service)).then(function getAccessToken(tokenData){if(!tokenData||!tokenData.access_token){startOAuth(state,service);return;}
var access_token=tokenData.access_token;var expires=Number(tokenData.expires);var token_ts=tokenData.token_ts;if(expires!==0&&Date.now()-token_ts>=expires){window.console.warn('Access token has expired, restarting flow');startOAuth(state,service);return;}
if(typeof ready==='function'){ready(access_token);}});};function startOAuth(state,service){clearStorage(service);oauthflow.start(state,service);}
function tokenDataReady(e){var parameters=e.data;if(!parameters||!parameters.access_token){return;}
if(e.origin!==APP_ORIGIN){return;}
Curtain.show('wait',accessTokenCbData.state);window.setTimeout(function do_token_ready(){var access_token=parameters.access_token;if(parameters.state===accessTokenCbData.state){accessTokenCbData.callback(access_token);}else{window.console.error('FB: Error in state',parameters.state,accessTokenCbData.state);return;}
var end=parameters.expires_in;ImportStatusData.put(getKey(accessTokenCbData.service),{access_token:access_token,expires:end*1000,token_ts:Date.now()}).then(function notify_parent(){parent.postMessage({type:'token_stored',data:''},APP_ORIGIN);});},0);}
window.addEventListener('message',tokenDataReady);})(document);}