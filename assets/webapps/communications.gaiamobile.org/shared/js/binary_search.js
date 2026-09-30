;'use strict';var utils=window.utils||{};utils.binarySearch=function(target,array,options){var arrayField=options.arrayField,transformFunction=options.transformFunction,compareFunction=options.compareFunction;function getItem(array,index){var item=array[index];if(arrayField){item=item[arrayField];if(typeof transformFunction==='function'){item=transformFunction(item);}}
return item;}
function compare(target,item){var out;if(typeof compareFunction==='function'){out=compareFunction(target,item);}
else{if(typeof target==='string'){out=target.localeCompare(item);}
else{out=target.toString().localeCompare(item);}}
return out;}
var from=options.from;if(typeof from==='undefined'){from=0;}
var to=options.to;if(typeof to==='undefined'){to=array.length-1;}
if(to<from){return[];}
var middleIndex=Math.floor((to-from)/2);var item=getItem(array,from+middleIndex);var compareResult=compare(target,item);if(compareResult===0){var results=[from+middleIndex];var next=from+middleIndex+1;var finish=false;while(next<=(array.length-1)&&!finish){item=getItem(array,next);if(compare(target,item)===0){results.push(next);}
else{finish=true;}
next++;}
finish=false;next=from+middleIndex-1;while(next>=0&&!finish){item=getItem(array,next);if(compare(target,item)===0){results.push(next);}
else{finish=true;}
next--;}
return results;}
else if(compareResult<0){return utils.binarySearch(target,array,{from:from,to:to-middleIndex-1,arrayField:arrayField,transformFunction:transformFunction,compareFunction:compareFunction});}
else{return utils.binarySearch(target,array,{from:from+middleIndex+1,to:to,arrayField:arrayField,transformFunction:transformFunction,compareFunction:compareFunction});}};