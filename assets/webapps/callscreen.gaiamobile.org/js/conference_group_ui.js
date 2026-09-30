;'use strict';var ConferenceGroupUI=(function(){var groupCalls=document.getElementById('group-call-details'),groupCallsList,groupCallsHeader,initialized=false,bdiGroupCallsCountElt;document.getElementById('group-show').addEventListener('click',showGroupDetails);function _init(callback){if(initialized){callback();}
LazyLoader.load([groupCalls],function(){groupCallsHeader=groupCalls.querySelector('header');groupCallsList=document.getElementById('group-call-details-list');document.getElementById('group-hide').addEventListener('click',_hideGroupDetails);if(!initialized){bdiGroupCallsCountElt=document.createElement('bdi');groupCallsHeader.appendChild(bdiGroupCallsCountElt);}
initialized=true;callback();});}
function _hideGroupDetails(evt){if(evt){evt.preventDefault();}
if(!navigator.mozTelephony.conferenceGroup.calls.length){_removeAllCalls();}
groupCalls.classList.remove('display');}
function _removeAllCalls(){var callNodes=groupCalls.querySelectorAll('.handled-call');for(var i=0;i<callNodes.length;i++){removeCall(callNodes[i]);}}
function addCall(node){_init(function(){groupCallsList.appendChild(node);});}
function removeCall(node){if(node.parentNode){node.parentNode.removeChild(node);}}
function showGroupDetails(evt){if(evt){evt.stopPropagation();}
groupCalls.classList.add('display');}
function hideGroupDetails(){setTimeout(_hideGroupDetails,ConferenceGroupUI.isGroupDetailsShown()?CallScreen.callEndPromptTime:0);}
function isGroupDetailsShown(){return groupCalls.classList.contains('display');}
function markCallsAsEnded(){_init(function(){var callElems=groupCallsList.getElementsByTagName('SECTION');for(var i=0;i<callElems.length;i++){callElems[i].dataset.groupHangup='groupHangup';}});}
function setGroupDetailsHeader(text){_init(function(){if(typeof(text)==='string'){navigator.mozL10n.setAttributes(bdiGroupCallsCountElt,text);}else{navigator.mozL10n.setAttributes(bdiGroupCallsCountElt,text.id,text.args);}});}
return{addCall:addCall,removeCall:removeCall,showGroupDetails:showGroupDetails,hideGroupDetails:hideGroupDetails,isGroupDetailsShown:isGroupDetailsShown,markCallsAsEnded:markCallsAsEnded,setGroupDetailsHeader:setGroupDetailsHeader};})();