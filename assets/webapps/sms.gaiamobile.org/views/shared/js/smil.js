;(function(){'use strict';var unsafeFilenamePattern=/[^a-zA-Z0-9_#.()?&%-]/g;var encoder=new TextEncoder('UTF-8');function SMIL_generateSlides(data,slide,slideIndex){const DURATION=5000;var id;var blobType;var media='';var text='';var name='';if(slide.blob){blobType=Utils.typeFromMimeType(slide.blob.type);if(blobType){var tagName=tagNameFromBlobType(blobType);var region='region="Image"';if(tagName==='ref'){region='';}
name=slide.name.substr(slide.name.lastIndexOf('/')+1);name=name.replace(unsafeFilenamePattern,'#');name=SMIL_generateUniqueLocation(data,name);media='<'+tagName+' src="'+name+'" '+region+'/>';data.attachments.push({id:'<'+name+'>',location:name,content:slide.blob});}}
if(slide.text){id='text_'+slideIndex+'.txt';text='<text src="'+id+'" region="Text"/>';data.attachments.push({id:'<'+id+'>',location:id,content:new Blob([encoder.encode(slide.text)],{type:'text/plain'})});}
data.parts.push('<par dur="'+DURATION+'ms">'+media+text+'</par>');return data;}
function tagNameFromBlobType(blobType){var out;switch(blobType){case'vcard':out='ref';break;default:out=blobType;}
return out;}
function SMIL_generateUniqueLocation(data,location){var extension,name,result;var FILENAME_LIMIT=40;function SMIL_uniqueLocationMatches(attachment){return attachment.location===result;}
var index=location.lastIndexOf('.');if(index===-1){name=location;extension='';}else{extension=location.slice(index);name=location.slice(0,index);}
if(name.length+extension.length>FILENAME_LIMIT){name=name.slice(0,FILENAME_LIMIT-extension.length);}
result=name+extension;var duplicateIndex=2;while(data.attachments.some(SMIL_uniqueLocationMatches)){var truncIndex=0;result=name+'_'+duplicateIndex++ +extension;while(result.length>FILENAME_LIMIT){duplicateIndex=2;name=name.slice(0,--truncIndex);result=name+extension;}}
return result;}
window.SMIL={parse:function SMIL_parse(message){var smil=message.smil;var attachments=message.attachments;var slides=[];var attachmentsNotFound=false;var smilMismatched=false;var doc;var parTags;function readTextBlob(blob){if(!blob){return Promise.resolve('');}
var defer=Utils.Promise.defer();var textReader=new FileReader();textReader.onload=function(event){defer.resolve(event.target.result);};textReader.onerror=function(event){console.error('Error reading text blob');defer.resolve('');};textReader.readAsText(blob,'UTF-8');return defer.promise;}
function findAttachment(name){var index=0;var length=attachments.length;name=name.replace(/^cid:/,'');for(;index<length;index++){if(attachments[index].location===name||attachments[index].id==='<'+name+'>'){return attachments[index];}}
return null;}
function convertWbmpToPng(slide){var defer=Utils.Promise.defer();var reader;slide.name=slide.name.slice(0,-5)+'.png';reader=new FileReader();reader.onload=function(event){WBMP.decode(event.target.result,function callback(blob){slide.blob=blob;defer.resolve();});};reader.onerror=function(event){console.error('Error reading text blob');defer.resolve();};reader.readAsArrayBuffer(slide.blob);return defer.promise;}
function SMIL_parseWithoutSMIL(attachment,idx){var blob=attachment.content;if(!blob){return Promise.resolve();}
var result;var type=Utils.typeFromMimeType(blob.type);if(type==='text'&&blob.type==='text/plain'){result=readTextBlob(blob).then((text)=>{slides[idx]={text:text};});}else if(type){var slide={name:attachment.location,blob:attachment.content};if(slide.name&&slide.name.slice(-5)==='.wbmp'){result=convertWbmpToPng(slide);}
slides[idx]=slide;}
return result||Promise.resolve();}
function SMIL_parseHandleParTag(par,index){if(attachmentsNotFound){return;}
var mediaElements=par.querySelectorAll('img, video, audio, ref');var textElement=par.querySelector('text');var attachment,src;var promises=Array.from(mediaElements).map((element)=>{var result;var slide={};src=element.getAttribute('src');attachment=findAttachment(src);if(attachment){slide={name:attachment.location,blob:attachment.content};slides.push(slide);if(slide.name&&slide.name.slice(-5)==='.wbmp'){result=convertWbmpToPng(slide);}}else{attachmentsNotFound=true;}
return result||Promise.resolve();});if(textElement){src=textElement.getAttribute('src');attachment=findAttachment(src);if(attachment){var slide=slides[slides.length-1];if(!slide||typeof slide.text!=='undefined'){slide={};slides.push(slide);}
slide.text='';promises.push(readTextBlob(attachment.content).then((text)=>slide.text=text));}else{attachmentsNotFound=true;}}
return Promise.all(promises);}
var result;if(smil){doc=(new DOMParser()).parseFromString(smil,'application/xml');parTags=doc.documentElement.getElementsByTagName('par');var elements=Array.reduce(parTags,(count,par)=>count+par.childElementCount,0);if(elements!==attachments.length){smilMismatched=true;}else{result=Promise.all(Array.from(parTags).map(SMIL_parseHandleParTag));}}
if(!smil||attachmentsNotFound||!slides.length||smilMismatched){slides=Array(attachments.length);result=Promise.all(attachments.map(SMIL_parseWithoutSMIL));}
return(result||Promise.resolve()).then(()=>slides);},generate:function SMIL_generate(slides){const HEADER='<head><layout>'+'<root-layout width="320px" height="480px"/>'+'<region id="Image" left="0px" top="0px"'+' width="320px" height="320px" fit="meet"/>'+'<region id="Text" left="0px" top="320px"'+' width="320px" height="160px" fit="meet"/>'+'</layout></head>';var data=slides.reduce(SMIL_generateSlides,{attachments:[],parts:[]});data.smil='<smil>'+HEADER+'<body>'+
data.parts.join('')+'</body></smil>';delete data.parts;return data;}};})();