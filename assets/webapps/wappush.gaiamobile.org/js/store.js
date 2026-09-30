;'use strict';var StoreProvisioning=(function(){var CP_APN_KEY='ril.data.cp.apns';var MCC_KEY='operatorvariant.mcc';var MNC_KEY='operatorvariant.mnc';var mccMncCodes={mcc:'000',mnc:'00'};function sp_getMccMncCodes(iccCardIndex,callback){var settings=navigator.mozSettings;if(!settings){if(callback){callback();}
return;}
iccCardIndex=iccCardIndex||0;var transaction=navigator.mozSettings.createLock();var mccRequest=transaction.get(MCC_KEY);mccRequest.onsuccess=function(){var mccs=mccRequest.result[MCC_KEY];if(!mccs||!Array.isArray(mccs)||!mccs[iccCardIndex]){mccMncCodes.mcc='000';}else{mccMncCodes.mcc=mccs[iccCardIndex];}
var mncRequest=transaction.get(MNC_KEY);mncRequest.onsuccess=function(){var mncs=mncRequest.result[MNC_KEY];if(!mncs||!Array.isArray(mncs)||!mncs[iccCardIndex]){mccMncCodes.mnc='00';}else{mccMncCodes.mnc=mncs[iccCardIndex];}
if(callback){callback(mccMncCodes.mcc,mccMncCodes.mnc);}};};}
function sp_provision(parameters,iccCardIndex,callback){var existingApns=null;var newApns={};for(var i=0;i<parameters.length;i++){parameters[i]._id=uuid();}
var settings=navigator.mozSettings;if(!settings){if(callback){callback();}
return;}
sp_getMccMncCodes(iccCardIndex,function sp_getMccMncCodesCb(){var transaction=navigator.mozSettings.createLock();var load=transaction.get(CP_APN_KEY);load.onsuccess=function onsuccessCb(){existingApns=load.result[CP_APN_KEY];var data={},mcc=mccMncCodes.mcc,mnc=mccMncCodes.mnc;if(!existingApns){newApns[mcc]={};newApns[mcc][mnc]=parameters;data[CP_APN_KEY]=newApns;}else{if(!existingApns[mcc]){existingApns[mcc]={};}
if(!existingApns[mcc][mnc]){existingApns[mcc][mnc]=[];}
existingApns[mcc][mnc]=existingApns[mcc][mnc].concat(parameters);data[CP_APN_KEY]=existingApns;}
transaction.set(data);iccCardIndex=iccCardIndex||0;var request=transaction.get('ril.data.apnSettings');request.onsuccess=function(){var apnSettings=request.result['ril.data.apnSettings'];if(!apnSettings||!Array.isArray(apnSettings)){apnSettings=[[],[]];}
var apnList=apnSettings[iccCardIndex];parameters.forEach(function(apn){var apnEnabled=false;for(var i=0;i<apnList.length;i++){if(apnList[i].types[0]===apn.types[0]){apnList[i]=apn;apnEnabled=true;break;}}
if(!apnEnabled){apnList.push(apn);}});transaction.set({'ril.data.apnSettings':apnSettings,'apn.selections':null});if(callback){callback();}};request.onerror=function onError(){if(callback){callback();}};};load.onerror=function onerrorCb(){if(callback){callback();}};});}
return{getMccMncCodes:sp_getMccMncCodes,provision:sp_provision};})();