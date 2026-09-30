;'use strict';function ThumbnailList(groupClass,container){if(!groupClass||!container){throw new Error('group class or container cannot be null or undefined');}
this.thumbnailMap={};this.groupMap={};this.itemGroups=[];this.count=0;this.groupClass=groupClass;this.container=container;}
ThumbnailList.prototype.addItem=function(item){if(!item){return null;}
if(this.thumbnailMap[item.name]){return this.thumbnailMap[item.name];}
var self=this;function createItemGroup(item,before){var group=new self.groupClass(item);self.container.insertBefore(group.htmlNode,before?before.htmlNode:null);return group;}
function getItemGroup(item){var groupID=self.groupClass.getGroupID(item);var i;for(i=0;i<self.itemGroups.length;i++){if(self.itemGroups[i].groupID===groupID){return self.itemGroups[i];}else if(self.groupClass.compareGroupID(self.itemGroups[i].groupID,groupID)<0){break;}}
var createdGroup=createItemGroup(item,self.itemGroups[i]);self.itemGroups.splice(i,0,createdGroup);return createdGroup;}
var group=getItemGroup(item);var thumbnail=group.addItem(item);this.groupMap[item.name]=group;this.thumbnailMap[item.name]=thumbnail;this.count++;return thumbnail;};ThumbnailList.prototype.removeItem=function(filename){if(!this.thumbnailMap[filename]){return;}
var group=this.groupMap[filename];group.removeItem(this.thumbnailMap[filename]);if(!group.getCount()){this.container.removeChild(group.htmlNode);this.itemGroups.splice(this.itemGroups.indexOf(group),1);}
this.count--;delete this.groupMap[filename];delete this.thumbnailMap[filename];};ThumbnailList.prototype.reset=function(){for(var name in this.thumbnailMap){this.groupMap[name].removeItem(this.thumbnailMap[name]);}
this.container.innerHTML='';this.thumbnailMap={};this.itemGroups=[];this.groupMap={};this.count=0;};ThumbnailList.prototype.localize=function(){this.itemGroups.forEach(function(group){group.localize();});};