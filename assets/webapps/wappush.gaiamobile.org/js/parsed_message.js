;(function(exports){'use strict';function ParsedMessage(obj){if(obj){for(var key in obj){this[key]=obj[key];}}}
ParsedMessage.prototype={constructor:ParsedMessage,toJSON:function pm_toJSON(){var obj={type:this.type,sender:this.sender,serviceId:this.serviceId,timestamp:this.timestamp};if(this.href){obj.href=this.href;}
if(this.id){obj.id=this.id;}
if(this.created){obj.created=this.created;}
if(this.expires){obj.expires=this.expires;}
if(this.text){obj.text=this.text;}
if(this.action){obj.action=this.action;}
if(this.provisioning){obj.provisioning=this.provisioning;}
return obj;},save:function pm_save(){var self=this;var json_message=this.toJSON();return MessageDB.put(json_message).then(function(status){if(status==='updated'){self.timestamp=json_message.timestamp;}
return Promise.resolve(status);});},isExpired:function pm_isExpired(){return(this.expires&&(this.expires<Date.now()))||false;},getUniqueId:function pm_getUniqueId(){return this.timestamp;}};ParsedMessage.from=function pm_from(message,timestamp){var parser=new DOMParser();var doc=parser.parseFromString(message.content,'text/xml');var obj=new ParsedMessage();obj.type=message.contentType;obj.sender=message.sender;obj.serviceId=message.serviceId;obj.timestamp=timestamp.toString();if(message.contentType==='text/vnd.wap.si'){var indicationNode=doc.querySelector('indication');if(indicationNode.hasAttribute('href')){obj.href=indicationNode.getAttribute('href');}
obj.text=indicationNode.textContent;if(indicationNode.hasAttribute('created')){var date=new Date(indicationNode.getAttribute('created'));obj.created=date.getTime();}
if(indicationNode.hasAttribute('si-expires')){var expiresDate=new Date(indicationNode.getAttribute('si-expires'));obj.expires=expiresDate.getTime();}
if(indicationNode.hasAttribute('action')){obj.action=indicationNode.getAttribute('action');}else{obj.action='signal-medium';}
if(indicationNode.hasAttribute('si-id')){obj.id=indicationNode.getAttribute('si-id');}else if(obj.action==='delete'){return null;}else if(obj.href){obj.id=obj.href;}}else if(message.contentType==='text/vnd.wap.sl'){var slNode=doc.querySelector('sl');obj.href=slNode.getAttribute('href');if(slNode.hasAttribute('action')){obj.action=slNode.getAttribute('action');}else{obj.action='execute-low';}}else if(message.contentType==='text/vnd.wap.connectivity-xml'){obj.provisioning=Provisioning.fromMessage(message);if(!obj.provisioning.authInfo){return null;}
var authInfo=obj.provisioning.authInfo;if(authInfo.checked&&!authInfo.pass){return null;}
obj.text='cp-message-received';}else{return null;}
return obj;};ParsedMessage.load=function pm_load(timestamp){return MessageDB.retrieve(timestamp).then(function(message){return new ParsedMessage(message);});};exports.ParsedMessage=ParsedMessage;})(window);