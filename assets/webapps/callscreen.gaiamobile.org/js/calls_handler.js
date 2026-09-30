;'use strict';var CallsHandler=(function callsHandler(){var CALLS_LIMIT=2;var CDMA_CALLS_LIMIT=2;var handledCalls=[];var exitCallScreenTimeout=null;var toneInterval=null;var telephony=window.navigator.mozTelephony;telephony.oncallschanged=onCallsChanged;var conn=window.navigator.mozMobileConnections&&window.navigator.mozMobileConnections[0];if(conn&&conn.voice&&conn.voice.network&&conn.voice.network.mcc){SimplePhoneMatcher.mcc=conn.voice.network.mcc;}
var btHelper=new BluetoothHelper();var screenLock;function setup(){if(telephony){telephony.muted=false;if(telephony.ownAudioChannel){telephony.ownAudioChannel();}}
btHelper.getConnectedDevicesByProfile(btHelper.profiles.HFP,function(result){CallScreen.setBTReceiverIcon(!!(result&&result.length));});btHelper.onhfpstatuschanged=function(evt){CallScreen.setBTReceiverIcon(evt.status);};var acm=navigator.mozAudioChannelManager;if(acm){acm.addEventListener('headphoneschange',function onheadphoneschange(){if(acm.headphones){CallScreen.switchToDefaultOut();}});}
btHelper.onscostatuschanged=function onscostatuschanged(evt){if(evt.status){CallScreen.switchToDefaultOut();}};navigator.mozSetMessageHandler('headset-button',handleHSCommand);navigator.mozSetMessageHandler('bluetooth-dialer-command',handleBTCommand);}
var highPriorityWakeLock=null;function onCallsChanged(){if(!highPriorityWakeLock&&telephony.calls.length>0){highPriorityWakeLock=navigator.requestWakeLock('high-priority');}
if(highPriorityWakeLock&&telephony.calls.length===0){highPriorityWakeLock.unlock();highPriorityWakeLock=null;}
if(telephony.active){telephony.active.addEventListener('disconnected',handleDisconnectAndPlayBusyTone);}
telephony.calls.forEach(function callIterator(call){var alreadyAdded=handledCalls.some(function hcIterator(hc){return(hc.call===call);});if(!alreadyAdded){addCall(call);}});function hcIterator(call){return(call===hc.call);}
for(var index=(handledCalls.length-1);index>=0;index--){var hc=handledCalls[index];var stillHere=telephony.calls.some(hcIterator)||telephony.conferenceGroup.calls.some(hcIterator);if(!stillHere){removeCall(index);}}
if(cdmaCallWaiting()){handleCallWaiting(telephony.calls[0]);}else{if(isCdma3WayCall()){CallScreen.hidePlaceNewCallButton();}else if(handledCalls.length!==0){CallScreen.showPlaceNewCallButton();}}
updateMergeAndOnHoldStatus();updateMuteAndSpeakerStatus();CallScreen.setCallerContactImage();exitCallScreenIfNoCalls(CallScreen.callEndPromptTime);}
function addCall(call){if(handledCalls.length&&(call.state!='incoming')&&(call.state!='dialing')){return;}
if(telephony.calls.length>CALLS_LIMIT){HandledCall(call);call.hangUp();return;}
if(handledCalls.length===0){CallScreen.unmute();CallScreen.enableKeypadButton();CallScreen.switchToDefaultOut(true);}
var hc=new HandledCall(call);handledCalls.push(hc);CallScreen.insertCall(hc.node);if(call.state==='incoming'){turnScreenOn(call);}
if(handledCalls.length>1){if(call.state==='incoming'){hc.hide();handleCallWaiting(call);}else{updatePlaceNewCall();hc.show();}}else{if(window.location.hash.startsWith('#locked')&&(call.state==='incoming')){CallScreen.initLockScreenLayout();CallScreen.render('incoming-locked');}else{CallScreen.render(call.state);}}}
function removeCall(index){handledCalls.splice(index,1);if(handledCalls.length===0){CallScreen.disableKeypadButton();return;}
CallScreen.hideIncoming();var remainingCall=handledCalls[0];if(remainingCall.call.state==='incoming'){remainingCall.show();setTimeout(function nextTick(){if(remainingCall.call.state==='incoming'){CallScreen.render('incoming');}});return;}}
function turnScreenOn(call){screenLock=navigator.requestWakeLock('screen');call.addEventListener('statechange',function callStateChange(){call.removeEventListener('statechange',callStateChange);if(screenLock){screenLock.unlock();screenLock=null;}});}
function handleDisconnectAndPlayBusyTone(evt){if(evt.call.disconnectedReason==='Busy'){var sequence=[[480,620,500],[0,0,500],[480,620,500],[0,0,500],[480,620,500],[0,0,500]];var sequenceDuration=sequence.reduce(function(prev,curr){return prev+curr[2];},0);TonePlayer.playSequence(sequence);exitCallScreenIfNoCalls(sequenceDuration);}}
function handleCallWaiting(call){var number=call.secondId?call.secondId.number:call.id.number;if(!number){navigator.mozL10n.setAttributes(CallScreen.incomingNumber,'withheld-number');navigator.mozL10n.translateFragment(CallScreen.incomingNumber);FontSizeManager.adaptToSpace(FontSizeManager.SECOND_INCOMING_CALL,CallScreen.incomingNumber,false,'end');return;}
if(navigator.mozIccManager.iccIds.length>1){navigator.mozL10n.setAttributes(CallScreen.incomingSim,'sim-number',{n:call.serviceId+1});}else{CallScreen.incomingSim.hidden=true;}
Contacts.findByNumber(number,function lookupContact(contact,matchingTel){if(contact&&contact.name){CallScreen.incomingInfo.classList.add('additionalInfo');CallScreen.incomingNumber.textContent=contact.name;var additionalL10n=Utils.getPhoneNumberAdditionalInfo(matchingTel);navigator.mozL10n.setAttributes(CallScreen.incomingNumberAdditionalTelType,additionalL10n.id,additionalL10n.args);CallScreen.incomingNumberAdditionalTel.textContent=number;}else{CallScreen.incomingInfo.classList.remove('additionalInfo');CallScreen.incomingNumber.textContent=number;CallScreen.incomingNumberAdditionalTelType.removeAttribute('data-l10n-id');CallScreen.incomingNumberAdditionalTelType.textContent='';CallScreen.incomingNumberAdditionalTel.textContent='';}
FontSizeManager.adaptToSpace(FontSizeManager.SECOND_INCOMING_CALL,CallScreen.incomingNumber,false,'end');if(contact&&contact.name){FontSizeManager.ensureFixedBaseline(FontSizeManager.SECOND_INCOMING_CALL,CallScreen.incomingNumber);}});if(cdmaCallWaiting()){CallScreen.holdAndAnswerOnly=true;}
CallScreen.showIncoming();playWaitingTone(call);}
function exitCallScreenIfNoCalls(timeout){if(handledCalls.length===0){document.body.classList.toggle('no-handled-calls',true);if(exitCallScreenTimeout!==null){clearTimeout(exitCallScreenTimeout);exitCallScreenTimeout=null;}
exitCallScreenTimeout=setTimeout(function(evt){exitCallScreenTimeout=null;if(handledCalls.length===0){window.close();}else{document.body.classList.toggle('no-handled-calls',false);}},timeout);}}
function updateAllPhoneNumberDisplays(){handledCalls.forEach(function(call){if(!call._leftGroup){call.restorePhoneNumber();}});}
window.addEventListener('resize',updateAllPhoneNumberDisplays);function numOpenLines(){return telephony.calls.length+
(telephony.conferenceGroup.calls.length?1:0);}
function handleBTCommand(message){var command=message.command;switch(command){case'CHUP':end();break;case'ATA':answer();break;case'CHLD=0':hangupWaitingCalls();break;case'CHLD=1':if((handledCalls.length===1)&&!cdmaCallWaiting()){end();}else{endAndAnswer();}
break;case'CHLD=2':if((handledCalls.length===1)&&!cdmaCallWaiting()){holdOrResumeSingleCall();}else{holdAndAnswer();}
break;case'CHLD=3':mergeCalls();break;default:var partialCommand=command.substring(0,3);if(partialCommand==='VTS'){KeypadManager.press(command.substring(4));}
break;}}
var lastHeadsetPress=0;function handleHSCommand(message){switch(message){case'headset-button-press':lastHeadsetPress=Date.now();return;case'headset-button-release':if((Date.now()-lastHeadsetPress)>1000){return;}
break;default:return;}
if(telephony.active){end();}else if((handledCalls.length>1)||cdmaCallWaiting()){holdAndAnswer();}else{answer();}}
function answer(){if(!handledCalls.length){return;}
handledCalls[0].call.answer();}
function holdAndAnswer(){if((handledCalls.length<2)&&!cdmaCallWaiting()){return;}
if(telephony.active){telephony.active.hold();if(cdmaCallWaiting()){btHelper.answerWaitingCall();}}else if(handledCalls.length>=2){var lastCall=handledCalls[handledCalls.length-1].call;lastCall.answer();}else{handledCalls[0].call.hold();}
CallScreen.hideIncoming();if(cdmaCallWaiting()){handledCalls[0].updateCallNumber();CallScreen.cdmaCallWaiting=true;stopWaitingTone();}}
function endAndAnswer(){if((handledCalls.length<2)&&!cdmaCallWaiting()){return;}
if(telephony.active===telephony.conferenceGroup){endConferenceCall().then(function(){CallScreen.hideIncoming();},function(){});return;}
if(cdmaCallWaiting()){handledCalls[0].call.hold();stopWaitingTone();btHelper.answerWaitingCall();}else{var callToEnd=telephony.active||handledCalls[handledCalls.length-2].call;var callToAnswer;handledCalls.some(function(handledCall){if(handledCall.call!==callToEnd){callToAnswer=handledCall.call;return true;}});if(callToEnd&&callToAnswer){callToEnd.addEventListener('disconnected',function ondisconnected(){callToEnd.removeEventListener('disconnected',ondisconnected);callToAnswer.answer();});callToEnd.hangUp();}else if(callToEnd){callToEnd.hangUp();}else if(callToAnswer){callToAnswer.answer();}}
CallScreen.hideIncoming();if(cdmaCallWaiting()){handledCalls[0].updateCallNumber();CallScreen.cdmaCallWaiting=true;}}
function toggleCalls(){if(CallScreen.incomingContainer.classList.contains('displayed')&&!cdmaCallWaiting()){return;}
if(numOpenLines()<2&&!cdmaCallWaiting()){if(!telephony.active){holdOrResumeSingleCall();}
return;}
telephony.active.hold();btHelper.toggleCalls();}
function holdOrResumeSingleCall(){if(numOpenLines()!==1||(telephony.calls.length&&(telephony.calls[0].state==='incoming'||!telephony.calls[0].switchable))){return;}
if(telephony.active){telephony.active.hold();}else{var line=telephony.calls.length?telephony.calls[0]:telephony.conferenceGroup;line.resume();}}
function hangupWaitingCalls(){handledCalls.forEach(function(handledCall){var callState=handledCall.call.state;if(callState==='held'||(callState==='incoming'&&handledCalls.length>1)){handledCall.call.hangUp();}});}
function ignore(){if(cdmaCallWaiting()){stopWaitingTone();btHelper.ignoreWaitingCall();}else{var ignoreIndex=handledCalls.length-1;handledCalls[ignoreIndex].call.hangUp();}
CallScreen.hideIncoming();}
function endConferenceCall(){return telephony.conferenceGroup.hangUp().then(function(){ConferenceGroupHandler.signalConferenceEnded();},function(){console.error('Failed to hangup Conference Call');});}
function end(){var callToEnd;if(telephony.active){callToEnd=telephony.active;}else if(numOpenLines()===1){if(telephony.conferenceGroup.calls.length){callToEnd=telephony.conferenceGroup;}else{callToEnd=telephony.calls[0];}}else{if(!handledCalls.length){return;}
var lastCallIndex=handledCalls.length-1;callToEnd=handledCalls[lastCallIndex].call;}
if(callToEnd.calls){endConferenceCall();}else{callToEnd.hangUp();}}
function unmute(){telephony.muted=false;}
function switchToSpeaker(){btHelper.disconnectSco();if(!telephony.speakerEnabled){telephony.speakerEnabled=true;}}
function switchToDefaultOut(doNotConnect){if(telephony.speakerEnabled){telephony.speakerEnabled=false;}
if(!doNotConnect&&telephony.active&&!document.hidden){btHelper.connectSco();}}
function switchToReceiver(){btHelper.disconnectSco();if(telephony.speakerEnabled){telephony.speakerEnabled=false;}}
function toggleMute(){telephony.muted=!telephony.muted;}
function toggleSpeaker(){if(telephony.speakerEnabled){CallsHandler.switchToDefaultOut();}else{CallsHandler.switchToSpeaker();}}
function playWaitingTone(call){var sequence=[[440,440,100],[0,0,100],[440,440,100]];toneInterval=window.setInterval(function playTone(){TonePlayer.playSequence(sequence);},10000);TonePlayer.playSequence(sequence);call.addEventListener('statechange',function callStateChange(){call.removeEventListener('statechange',callStateChange);window.clearInterval(toneInterval);});}
function stopWaitingTone(){window.clearInterval(toneInterval);}
function activeCall(){var telephonyActiveCall=telephony.active;var active=null;for(var i=0;i<handledCalls.length;i++){var handledCall=handledCalls[i];if(telephonyActiveCall===handledCall.call){active=handledCall;break;}}
return active;}
function activeCallForContactImage(){if(handledCalls.length===1){return handledCalls[0];}
return[activeCall()].concat(handledCalls).find(function(elem){return!elem||!elem.call.group;});}
function cdmaCallWaiting(){return((telephony.calls.length===1)&&(telephony.calls[0].state==='connected')&&(telephony.calls[0].secondId));}
function isFirstCallOnCdmaNetwork(){var cdmaTypes=['evdo0','evdoa','evdob','1xrtt','is95a','is95b'];if(handledCalls.length!==0){var ci=handledCalls[0].call.serviceId;var type=window.navigator.mozMobileConnections[ci].voice.type;return(cdmaTypes.indexOf(type)!==-1);}else{return false;}}
function isCdma3WayCall(){return isFirstCallOnCdmaNetwork()&&((telephony.calls.length===CDMA_CALLS_LIMIT)||(telephony.conferenceGroup.calls.length>0));}
function mergeCalls(){if(telephony.conferenceGroup.calls.length===0&&telephony.calls.length===2){telephony.conferenceGroup.add(telephony.calls[0],telephony.calls[1]).catch(function(){CallScreen.showStatusMessage('conferenceAddError');});}else if(telephony.conferenceGroup.calls.length>0&&telephony.calls.length===1){telephony.conferenceGroup.add(telephony.calls[0]).catch(function(){CallScreen.showStatusMessage('conferenceAddError');});}else{console.warn('Cannot join conference call.');}}
function isEstablishingCall(){return telephony.calls.some(function(call){return call.state==='dialing'||call.state==='alerting';});}
function isAnyCallOnHold(){return telephony.calls.some(call=>call.state==='held')||(telephony.conferenceGroup&&telephony.conferenceGroup.state==='held');}
function isAnyCallSwitchable(){return telephony.calls.some(call=>call.switchable)||((telephony.conferenceGroup.calls.length>0)&&telephony.conferenceGroup.calls.every(call=>call.switchable));}
function isEveryCallMergeable(){return telephony.calls.every(call=>call.mergeable);}
function updatePlaceNewCall(){if(isEstablishingCall()||(numOpenLines()===0)){CallScreen.disablePlaceNewCallButton();}else{CallScreen.enablePlaceNewCallButton();}}
function updateMergeAndOnHoldStatus(){var isEstablishing=isEstablishingCall();if(numOpenLines()===0){CallScreen.disableOnHoldButton();}else if(numOpenLines()>1&&!isEstablishing){CallScreen.hideOnHoldButton();if(isEveryCallMergeable()){CallScreen.showOnHoldAndMergeContainer();CallScreen.showMergeButton();}else{CallScreen.hideOnHoldAndMergeContainer();}}else{CallScreen.hideMergeButton();CallScreen.setShowIsHeld(!telephony.active&&isAnyCallOnHold());if(isEstablishing){CallScreen.disableOnHoldButton();}else{CallScreen.enableOnHoldButton();}
if(isAnyCallSwitchable()){CallScreen.showOnHoldAndMergeContainer();CallScreen.showOnHoldButton();}else{CallScreen.hideOnHoldAndMergeContainer();}}}
function updateMuteAndSpeakerStatus(){if(telephony.active){CallScreen.enableMuteButton();CallScreen.enableSpeakerButton();}else{CallScreen.disableMuteButton();CallScreen.disableSpeakerButton();}}
return{setup:setup,answer:answer,holdAndAnswer:holdAndAnswer,endAndAnswer:endAndAnswer,toggleCalls:toggleCalls,ignore:ignore,end:end,toggleMute:toggleMute,toggleSpeaker:toggleSpeaker,unmute:unmute,switchToReceiver:switchToReceiver,switchToSpeaker:switchToSpeaker,switchToDefaultOut:switchToDefaultOut,holdOrResumeSingleCall:holdOrResumeSingleCall,checkCalls:onCallsChanged,mergeCalls:mergeCalls,updateAllPhoneNumberDisplays:updateAllPhoneNumberDisplays,updatePlaceNewCall:updatePlaceNewCall,exitCallScreenIfNoCalls:exitCallScreenIfNoCalls,updateMergeAndOnHoldStatus:updateMergeAndOnHoldStatus,updateMuteAndSpeakerStatus:updateMuteAndSpeakerStatus,get activeCall(){return activeCall();},get activeCallForContactImage(){return activeCallForContactImage();},isFirstCallOnCdmaNetwork:isFirstCallOnCdmaNetwork};})();