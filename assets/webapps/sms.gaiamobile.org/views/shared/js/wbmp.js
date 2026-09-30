;'use strict';var WBMP=(function(document){function decode(arrayBuffer,callback){var bytes=new Uint8Array(arrayBuffer);var ptr=0;function readOctet(){return bytes[ptr++]&0xff;}
function readMultiByteInteger(){var result=0;while(true){if(result&0xfe000000){throw'error parsing integer';}
var b=bytes[ptr++];result=(result<<7)|(b&0x7f);if(!(b&0x80)){return result;}}}
function write(data,w,bit){var color=bit?255:0;data[w]=color;data[w+1]=color;data[w+2]=color;data[w+3]=255;}
try{if(readMultiByteInteger()!==0){return false;}
if(readOctet()!==0){return false;}
var width=readMultiByteInteger();var height=readMultiByteInteger();if(width===0||width>65535||height===0||height>65535){return false;}
var canvas=document.createElement('canvas');canvas.setAttribute('width',width);canvas.setAttribute('height',height);var ctx=canvas.getContext('2d',{willReadFrequently:true});var imageData=ctx.createImageData(width,height);var data=imageData.data;for(var y=0;y<height;++y){for(var x=0;x<width;x+=8){var bits=bytes[ptr++];var w=(y*width+x)*4;write(data,w,bits&0x80);write(data,w+4,bits&0x40);write(data,w+8,bits&0x20);write(data,w+12,bits&0x10);write(data,w+16,bits&0x08);write(data,w+20,bits&0x04);write(data,w+24,bits&0x02);write(data,w+28,bits&0x01);}}
if(ptr>bytes.length){return null;}
ctx.putImageData(imageData,0,0);canvas.toBlob(callback);}catch(e){return null;}}
return{decode:decode};})(document);