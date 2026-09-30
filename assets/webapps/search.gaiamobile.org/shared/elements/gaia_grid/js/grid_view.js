;'use strict';(function(exports){const APP_LAUNCH_TIMEOUT=3000;function GridView(config){this.config=config;this.clickIcon=this.clickIcon.bind(this);this.onVisibilityChange=this.onVisibilityChange.bind(this);if(config.features.zoom){this.zoom=new GridZoom(this);}
this.layout=new GridLayout(this);if(config.element.hasAttribute('cols')){this.layout.cols=parseInt(config.element.getAttribute('cols'),10);}
this.start();}
GridView.prototype={icons:{},items:[],get element(){return this.config.element;},set cols(value){this.layout.cols=value;},_launchingApp:false,add:function(item,insertTo,expandGroup){if(!item){return;}
if(item.identifier){if(this.icons[item.identifier]){console.log('Error, duplicate identifier: ',item.identifier,new Error().stack);return;}
this.icons[item.identifier]=item;}else if(item.detail.type!=='divider'&&item.detail.type!=='placeholder'){console.log('Error, could not load identifier for object: ',JSON.stringify(item.detail));return;}
if(!isNaN(parseFloat(insertTo))&&isFinite(insertTo)){this.items.splice(insertTo,0,item);}else{insertTo=this.items.length;this.items.push(item);}
if(expandGroup){for(var i=insertTo+1,iLen=this.items.length;i<iLen;i++){var divider=this.items[i];if(divider.detail.type==='divider'){if(divider.detail.collapsed){divider.expand();}
break;}}}},getNearestItemIndex:function(x,y,isRow){var foundIndex=null;var leastDistance=null;var itemMiddleOffset=this.layout.gridItemWidth/2;for(var i=0,iLen=this.items.length;i<iLen;i++){var item=this.items[i];if(!item.isDraggable()){continue;}
if(this.config.features.disableSections&&item.detail.type==='divider'){continue;}
if(item.detail.type!=='divider'&&item.element.classList.contains('collapsed')){continue;}
var middleX=item.x+itemMiddleOffset;var middleY=item.y+item.pixelHeight/2;var xDistance=(isRow||item.detail.type==='divider')?0:x-middleX;var yDistance=y-middleY;var distance=Math.sqrt(xDistance*xDistance+
yDistance*yDistance);if(leastDistance===null||distance<leastDistance){leastDistance=distance;foundIndex=i;}}
return foundIndex;},start:function(){this.element.addEventListener('click',this.clickIcon);window.addEventListener('visibilitychange',this.onVisibilityChange);},stop:function(){this.element.removeEventListener('click',this.clickIcon);window.removeEventListener('visibilitychange',this.onVisibilityChange);},findItemFromElement:function(element,excludeCollapsedIcons){while(element&&element.parentNode!==this.element){element=element.parentNode;}
if(!element){return null;}
var i,iLen=this.items.length;var identifier=element.dataset.identifier;var icon=this.icons[identifier];if(!icon){for(i=0;i<iLen;i++){if(this.items[i].element===element){icon=this.items[i];break;}}}
if(icon&&excludeCollapsedIcons){if(icon.detail.type!=='divider'&&icon.detail.type!=='placeholder'&&icon.element.classList.contains('collapsed')){for(i=icon.detail.index+1;i<iLen;i++){if(this.items[i].detail.type==='divider'){return this.items[i];}}
console.warn('Collapsed icon found with no group');icon=null;}}
return icon;},onVisibilityChange:function(){this._launchingApp=false;},clickIcon:function(e){e.preventDefault();var inEditMode=this.dragdrop&&this.dragdrop.inEditMode;var action='launch';if(e.target.classList.contains('remove')){action='remove';}
var icon=this.findItemFromElement(e.target);if(!icon){return;}
if(action==='launch'){if(inEditMode&&e.target.classList.contains('icon')){if(!icon.isEditable()){return;}
action='edit';}else{if(!icon[action]){return;}
icon.element.classList.add('launching');var returnTimeout=500;setTimeout(function stateReturn(){if(icon.element){icon.element.classList.remove('launching');}},returnTimeout);}}
if((icon.detail.type==='app'||icon.detail.type==='bookmark')&&this._launchingApp){return;}
if((icon.detail.type==='app'&&icon.appState==='ready')||icon.detail.type==='bookmark'){this._launchingApp=true;if(this._launchingTimeout){window.clearTimeout(this._launchingTimeout);this._launchingTimeout=null;}
this._launchingTimeout=window.setTimeout(function(){this._launchingTimeout=null;this._launchingApp=false;}.bind(this),APP_LAUNCH_TIMEOUT);}
icon[action](e.target);},cleanItems:function(skipDivider){var appCount=0;var toRemove=[];this.items.forEach(function(item,idx){if(item instanceof GaiaGrid.Divider){if(appCount===0){toRemove.push(idx);}
appCount=0;}else{appCount++;}},this);toRemove.reverse();toRemove.forEach(function(idx){var removed=this.items.splice(idx,1)[0];removed.remove();},this);if(skipDivider){return;}
var lastItem=this.items[this.items.length-1];if(!lastItem||!(lastItem instanceof GaiaGrid.Divider)){this.items.push(new GaiaGrid.Divider());}},removeAllPlaceholders:function(){var toSplice=[];var previousItem;this.items.forEach(function(item,idx){if(item instanceof GaiaGrid.Placeholder){if((!previousItem||(previousItem&&previousItem instanceof GaiaGrid.Divider))&&this.dragdrop&&this.dragdrop.inDragAction){return;}
toSplice.push(idx);}
previousItem=item;},this);toSplice.reverse().forEach(function(idx){this.items.splice(idx,1)[0].remove();},this);},clear:function(){for(var i=0,iLen=this.items.length;i<iLen;i++){var item=this.items[i];if(item.element){this.element.removeChild(item.element);item.element=null;item.lastX=null;item.lastY=null;item.lastScale=null;}}
this.items=[];this.icons={};},createPlaceholders:function(coordinates,idx,count){var isRTL=(document.documentElement.dir==='rtl');for(var i=0;i<count;i++){var item=new GaiaGrid.Placeholder();this.items.splice(idx+i,0,item);item.setPosition(idx+i);var xPosition=(coordinates[0]+i)*this.layout.gridItemWidth;if(isRTL){xPosition=(this.layout.constraintSize-this.layout.gridItemWidth)-
xPosition;}
item.setCoordinates(xPosition,this.layout.offsetY);item.render();}},render:function(options){var self=this;options=options||{};this.removeAllPlaceholders();this.cleanItems(options.skipDivider);var oldHeight=this.layout.offsetY;this.layout.offsetY=0;var x=0;var y=0;function step(item){var pixelHeight=item.pixelHeight;self.layout.stepYAxis(pixelHeight);x=0;y++;}
var pendingCachedIcons=0;var onCachedIconRendered=()=>{if(--pendingCachedIcons<=0){this.element.removeEventListener('cached-icon-rendered',onCachedIconRendered);this.element.dispatchEvent(new CustomEvent('cached-icons-rendered'));}};this.element.addEventListener('cached-icon-rendered',onCachedIconRendered);var nextDivider=null;var oddDivider=true;var isRTL=(document.documentElement.dir==='rtl');for(var idx=0;idx<this.items.length;idx++){var item=this.items[idx];if(options.rerender&&item.element){this.element.removeChild(item.element);item.element=null;}
if(item.detail.type==='divider'){nextDivider=null;}else{if(!nextDivider){for(var i=idx+1;i<this.items.length;i++){if(this.items[i].detail.type==='divider'){nextDivider=this.items[i];oddDivider=!oddDivider;break;}}
if(nextDivider&&!nextDivider.detail.collapsed){this.layout.offsetY+=nextDivider.headerHeight;}}
if(nextDivider&&nextDivider.detail.collapsed){item.setPosition(idx);continue;}}
if(x>0&&item.gridWidth>1&&x+item.gridWidth>=this.layout.cols){var remaining=this.layout.cols-x;this.createPlaceholders([x,y],idx,remaining);idx+=remaining;item=this.items[idx];var lastItemInRow=this.items[idx-1];step(lastItemInRow);}
item.setPosition(idx);if(!options.skipItems){item.hasCachedIcon&&++pendingCachedIcons;var xPosition=x*this.layout.gridItemWidth;if(isRTL){xPosition=(this.layout.constraintSize-this.layout.gridItemWidth)-
xPosition;}
item.setCoordinates(xPosition,this.layout.offsetY);if(!item.active){item.render();}
if(item.detail.type==='divider'){if(oddDivider){item.element.classList.add('odd');}else{item.element.classList.remove('odd');}}}
x+=item.gridWidth;if((x>=this.layout.cols)&&(idx<this.items.length-1)){step(item);}}
if(this.layout.offsetY!=oldHeight){if(this.dragdrop&&this.dragdrop.inDragAction){this.layout.offsetY=oldHeight;}else{this.element.dispatchEvent(new CustomEvent('gaiagrid-resize',{detail:this.layout.offsetY}));}}
this.element.setAttribute('cols',this.layout.cols);pendingCachedIcons===0&&onCachedIconRendered();this.loadDragDrop();},loadDragDrop:function(){if(!this.dragdrop&&this.config.features.dragdrop){LazyLoader.load('shared/elements/gaia_grid/js/grid_dragdrop.js',()=>{if(this.dragdrop){return;}
this.dragdrop=new GridDragDrop(this);});}}};exports.GridView=GridView;}(window));