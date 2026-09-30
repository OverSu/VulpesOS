;'use strict';var FriendListRenderer=(function(){var orderCriteria={firstName:['givenName','familyName','email1'],lastName:['familyName','givenName','email1']};var HEADER_LETTERS=['ABCDEFGHIJKLMNOPQRSTUVWXYZ','ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ','АБВГДЂЕЁЖЗИЙЈКЛЉМНЊОПРСТЋУФХЦЧЏШЩЭЮЯ'].join('');var defaults={container:'#groups-list',orderBy:'lastName'};var finishCb;var totalContacts;var lock;var CHUNK_SIZE=10;var render=function render(contacts,cb,options){for(var key in defaults){if(typeof options[key]==='undefined'){options[key]=defaults[key];}}
finishCb=cb;totalContacts=contacts.length;lock=navigator.requestWakeLock('cpu');doRender(contacts,cb,options);};var doRender=function doRender(contacts,cb,options){var groupsList=document.querySelector(options.container);var orderBy=options.orderBy;var order=orderCriteria[orderBy];contacts.sort(function(a,b){return getStringToBeOrdered(a,order).localeCompare(getStringToBeOrdered(b,order));});var groups={};contacts.forEach(function(contact){var groupName=getGroupName(contact,order);if(!groups[groupName]){groups[groupName]=[];}
groups[groupName].push(contact);});var notRenderedParagraph=groupsList.querySelector('[data-order-by="'+
(orderBy==='firstName'?'lastName':'firstName')+'"]');if(notRenderedParagraph){notRenderedParagraph.parentNode.removeChild(notRenderedParagraph);}
var letterStart=0;doRenderGroupChunk(letterStart,HEADER_LETTERS[letterStart],groupsList,groups);};function doRenderGroupChunk(index,group,groupsList,groups){renderGroup(groupsList,group,groups[group],function(fragment){if(fragment){groupsList.appendChild(fragment);}
fragment=null;var headerLettersLength=HEADER_LETTERS.length;if(index+1<=headerLettersLength){window.setTimeout(function renderNextGroup(){doRenderGroupChunk(index+1,HEADER_LETTERS[index+1],groupsList,groups);});}
else if(group!='#'){window.setTimeout(function renderNextGroup(){doRenderGroupChunk(index+1,'#',groupsList,groups);});}
else{groupsList.removeChild(groupsList.firstElementChild);if(typeof finishCb==='function'){window.setTimeout(finishCb,totalContacts*2);}
if(lock){lock.unlock();}}});}
function doRenderGroupItems(from,groupsList,group,friends,element,cb){var end=from+CHUNK_SIZE;var list=element.children[1];for(var i=from;i<end&&i<friends.length;i++){var friend=friends[i];if(friend.search&&friend.search.length>0){var box=utils.misc.getPreferredPictureBox();friend.picwidth=box.width;friend.picheight=box.height;friend.search=Normalizer.toAscii(friend.search);utils.templates.append(list,friend);}}
if(i<friends.length){window.setTimeout(function renderNextChunk(){doRenderGroupItems(end,groupsList,group,friends,element,cb);});}
else{list.removeChild(list.firstElementChild);cb();}}
function renderGroup(groupsList,group,friends,cb){if(!friends||friends.length===0){window.setTimeout(cb);return;}
var fragment=document.createDocumentFragment();var element=utils.templates.append(groupsList,{group:group},fragment);doRenderGroupItems(0,groupsList,group,friends,element,function(){cb(fragment);});}
function getStringToBeOrdered(contact,order){var ret=contact.search;if(!ret){ret=[];order.forEach(function(field){ret.push(getValue(contact,field));});ret=contact.search=ret.join(' ');}
return ret;}
function getValue(contact,field){var out=contact[field];if(out){out=Array.isArray(out)?out[0]:out;}else{out='';}
return out;}
function getGroupName(contact,order){var ret=getStringToBeOrdered(contact,order);ret=ret.charAt(0).toUpperCase();ret=ret.replace(/[ÁÀ]/ig,'A');ret=ret.replace(/[ÉÈ]/ig,'E');ret=ret.replace(/[ÍÌ]/ig,'I');ret=ret.replace(/[ÓÒ]/ig,'O');ret=ret.replace(/[ÚÙ]/ig,'U');if(HEADER_LETTERS.indexOf(ret)<0){ret='#';}
return ret;}
return{'render':render};})();