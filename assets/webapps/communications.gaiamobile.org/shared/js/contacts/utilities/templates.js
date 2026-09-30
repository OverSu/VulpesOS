;;'use strict';var utils=window.utils||{};if(!utils.templates){(function(){var Templates=utils.templates={};function getTarget(element){var target=element;if(!element.tagName){target=document.querySelector(element);}
return target;}
function getTemplate(target,data){var templates=target.querySelectorAll('*[data-template]');if(templates.length===0){throw new Error('No template declared');}
if(templates.length>1&&templates.item(0).dataset.condition){throw new Error('Only one template supported in this version');}
return{template:templates.item(0),isMulti:false};}
function templateReplace(data){return function(text,property){var out;if(property.indexOf('.')===-1){out=data[property];if(Array.isArray(out)&&out.length>0){out=out[0];}}else{throw new Error('Dotted expressions not supported');}
if(typeof out==='undefined'){out=text;}
return out;};}
function add(element,data,mode,targetNode){var target=getTarget(element);var newElem;var theData=[data];if(data instanceof Array){theData=data;}
var multiTemplate=true;var template;var idx=0;theData.forEach(function(oneData){oneData._idx_=idx++;if(multiTemplate===true){var tresult=getTemplate(target,oneData);template=tresult.template;if(tresult.isMulti===false){multiTemplate=false;}}
if(template){newElem=this.render(template,oneData);target=targetNode||target;if(mode==='A'){target.appendChild(newElem);}else if(mode==='P'){if(target.firstChild){target.insertBefore(newElem,element.firstChild);}else{target.appendChild(newElem);}}}}.bind(Templates));return newElem;}
Templates.append=function(element,data,targetNode){var f=add.bind(this);return f(element,data,'A',targetNode);};Templates.prepend=function(element,data,targetNode){var f=add.bind(this);return f(element,data,'P',targetNode);};Templates.render=function(eleTemplate,data){var newElem=eleTemplate.cloneNode(true);newElem.removeAttribute('data-template');newElem.removeAttribute('data-condition');var pattern=/#(\w+[\w.]*)#/g;var inner=newElem.innerHTML;var replaceFunction=templateReplace(data);var ninner=inner.replace(pattern,replaceFunction);newElem.innerHTML=ninner;var attrs=newElem.attributes;var total=attrs.length;for(var c=0;c<total;c++){var val=attrs[c].value;var nval=val.replace(pattern,replaceFunction);newElem.setAttribute(attrs[c].name,nval);}
if(!newElem.id){if(data.id){newElem.id=data.id;}}
return newElem;};Templates.clear=function(element){var target=getTarget(element);var templates=target.querySelectorAll('*[data-template]');target.innerHTML='';var total=templates.length;for(var c=0;c<total;c++){target.appendChild(templates.item(c));}};})();}