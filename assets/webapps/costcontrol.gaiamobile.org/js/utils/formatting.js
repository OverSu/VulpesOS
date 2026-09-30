;'use strict';var Formatting=(function(){var MINUTE=60*1000;var HOUR=60*MINUTE;var DAY=24*HOUR;function getDaysOfDifference(a,b){return Math.floor((a.getTime()-b.getTime())/DAY);}
function getFormattedDate(timestamp,formatter){return formatter.format(timestamp);}
function formatTime(timestamp,formatter){if(!timestamp){return _('never');}
var now=new Date(),then=new Date(timestamp);if(formatter){return getFormattedDate(then,formatter);}
var date,time;var daysOfDifference=getDaysOfDifference(now,then);if(daysOfDifference===0){date=_('today');}else if(daysOfDifference===1){date=_('yesterday');}else{date=getFormattedDate(timestamp,Formatting.formatters.shortWeekday);}
time=getFormattedDate(timestamp,Formatting.formatters.shortTime);return _('day-hour-format',{day:date,time:time});}
function formatTimeSinceNow(timestamp){var now=new Date(),then=new Date(timestamp);var formattedTime=formatTime(timestamp);if(getDaysOfDifference(now,then)>0){return formattedTime;}
var age=now-then;if(age<MINUTE){formattedTime=_('minutes-ago-short',{value:0});}else if(age<HOUR){var minutes=Math.floor(age/MINUTE);formattedTime=_('minutes-ago-short',{value:minutes});}else if(age<DAY){var hours=Math.floor(age/HOUR);formattedTime=_('hours-ago-short',{value:hours});}
return formattedTime;}
function formatData(dataArray){return isNaN(dataArray[0])?'':_('magnitude',{value:dataArray[0],unit:dataArray[1]});}
function roundData(value,positions){positions=(typeof positions==='undefined')?2:positions;if(value<1000){return[value.toFixed(positions),_('B')];}
if(value<1000000){return[(value/1000).toFixed(positions),_('KB')];}
if(value<1000000000){return[(value/1000000).toFixed(positions),_('MB')];}
return[(value/1000000000).toFixed(positions),_('GB')];}
function getPositions(value,deltaPositions){deltaPositions=(typeof deltaPositions==='undefined')?0:deltaPositions;if(parseInt(value)===value){return 0;}
if(value<10){return 2+deltaPositions;}
if(value<100){return 1+deltaPositions;}
return 0;}
function smartRound(value,deltaPositions){deltaPositions=(typeof deltaPositions==='undefined')?0:deltaPositions;if(value<1000){var bPositions=getPositions(value,deltaPositions);return[value.toFixed(bPositions),_('B')];}
if(value<1000000){var kbytes=value/1000;var kbPositions=getPositions(kbytes,deltaPositions);return[kbytes.toFixed(kbPositions),_('KB')];}
if(value<1000000000){var mbytes=value/1000000;var mPositions=getPositions(mbytes,deltaPositions);return[mbytes.toFixed(mPositions),_('MB')];}
var gbytes=value/1000000000;var gPositions=getPositions(gbytes,deltaPositions);return[gbytes.toFixed(gPositions),_('GB')];}
function formatTimeHTML(timestampA,timestampB){function timeElement(content){var time=document.createElement('time');time.textContent=content;return time;}
var fragment=document.createDocumentFragment();if(typeof timestampB==='undefined'){fragment.appendChild(timeElement(Formatting.formatTime(timestampA)));return fragment;}
var dateA=new Date(timestampA);var dateB=new Date(timestampB);if(dateA.getFullYear()===dateB.getFullYear()&&dateA.getMonth()===dateB.getMonth()&&dateA.getDay()===dateB.getDay()){return formatTimeHTML(timestampB);}
fragment.appendChild(timeElement(Formatting.formatTime(timestampA,Formatting.formatters.shortDate)));fragment.appendChild(document.createTextNode(' – '));fragment.appendChild(timeElement(Formatting.formatTime(timestampB)));return fragment;}
function computeTelephonyMinutes(activity){return Math.ceil(activity.calltime/60000);}
return{getFormattedDate:getFormattedDate,formatTime:formatTime,formatTimeSinceNow:formatTimeSinceNow,formatData:formatData,roundData:roundData,getPositions:getPositions,smartRound:smartRound,formatTimeHTML:formatTimeHTML,computeTelephonyMinutes:computeTelephonyMinutes,formatters:{}};}());function setFormatters(){const locales=navigator.languages;Formatting.formatters.longDate=Intl.DateTimeFormat(locales,{month:'long',day:'numeric',year:'numeric'});Formatting.formatters.shortDate=Intl.DateTimeFormat(locales,{month:'short',day:'numeric',});Formatting.formatters.shortTime=Intl.DateTimeFormat(locales,{hour12:navigator.mozHour12,hour:'numeric',minute:'numeric'});Formatting.formatters.shortWeekday=Intl.DateTimeFormat(locales,{weekday:'short'});}
setFormatters();window.addEventListener('languagechange',setFormatters,false);window.addEventListener('timeformatchange',setFormatters,false);