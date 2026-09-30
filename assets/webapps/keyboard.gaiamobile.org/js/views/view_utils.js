;'use strict';(function(exports){var ViewUtils={};var scaleContext;ViewUtils.getScale=function(text,textWidth){if(!scaleContext){scaleContext=document.createElement('canvas').getContext('2d',{willReadFrequently:true});scaleContext.font='2rem sans-serif';}
var elementWidth=scaleContext.measureText(text).width;var s=textWidth/elementWidth;if(s>=1){return 1;}
if(s>=0.8){return 0.8;}
if(s>=0.7){return 0.7;}
if(s>=0.65){return 0.65;}
if(s>=0.6){return 0.6;}
return s;};ViewUtils.fitText=function(container,text,length,totalWidth){container.textContent='';if(!text){return null;}
var span=document.createElement('span');span.textContent=text;container.appendChild(span);var limit=0.6;var textWidth=(totalWidth-36)/length|0;textWidth-=6;var scale=ViewUtils.getScale(text,textWidth);if(scale<limit){var charactersReplaced=text.length%2;while(scale<limit&&charactersReplaced<text.length-2){charactersReplaced+=2;var halflen=(text.length-charactersReplaced)/2;span.textContent=text.substring(0,halflen)+'…'+
text.substring(text.length-halflen);scale=ViewUtils.getScale(text,textWidth);}}
span.style.display='inline-block';if(scale<1){span.style.width=(100/scale)+'%';span.style.transformOrigin='left';span.style.transform='scale('+scale+')';}else{span.style.width='100%';}
return span;};exports.ViewUtils=ViewUtils;}(window));