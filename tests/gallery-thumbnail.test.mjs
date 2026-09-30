import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

test('Gallery creates positive-size thumbnails even when its launch frame is hidden',()=>{
  const source=readFileSync(new URL('../gaia/apps/gallery/js/MetadataParser.js',import.meta.url),'utf8');
  const functionSource=source.slice(source.indexOf('  function computeThumbnailWidth()'),source.indexOf('  var thumbnailSize'));
  function size(width,height) {
    return vm.runInNewContext(functionSource+';computeThumbnailWidth();',{
      window:{innerWidth:width,innerHeight:height,devicePixelRatio:2},
      screen:{width:480,height:800},isPhone:true,
    });
  }
  assert.equal(size(0,0),400);
  assert.equal(size(480,800),400);
  assert.equal(size(800,480),400);
});
test('a queued Gallery preview cannot restart editing after destroy',()=>{
  const source=readFileSync(new URL('../gaia/apps/gallery/js/ImageEditor.js',import.meta.url),'utf8');
  const method=source.slice(source.indexOf('ImageEditor.prototype.edit ='),source.indexOf('ImageEditor.prototype.finishEdit ='));
  const scope={ImageEditor:function(){}};
  vm.runInNewContext(method,scope);
  let restarted=false;
  scope.ImageEditor.prototype.edit.call({previewCanvas:null,generateNewPreview(){restarted=true;}});
  assert.equal(restarted,false);
});
