import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const source=readFileSync(new URL('gaia/apps/keyboard/js/settings/layout_dictionary_downloader.js',root),'utf8');
test('every offered Latin dictionary is present and has a valid header',()=>{
  const layouts=JSON.parse(readFileSync(new URL('assets/webapps/keyboard.gaiamobile.org/js/settings/layouts.json',root)));
  for(const name of new Set(layouts.filter(l=>l.imEngineId==='latin'&&l.dictFilename).map(l=>l.dictFilename))){
    const data=readFileSync(new URL('gaia/apps/keyboard/js/imes/latin/dictionaries/'+name,root));
    assert.equal(data.subarray(0,8).toString(),'FxOSDICT',name);
  }
});
test('adding a language reads and verifies its local dictionary',async()=>{
  let requested,aborted=false;
  class XHR {
    open(method,url){requested=url;}
    send(){const b=readFileSync(new URL('gaia/apps/keyboard'+requested,root));this.response=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);this.onloadend();}
    abort(){aborted=true;}
  }
  const window={};vm.runInNewContext(source,{window,XMLHttpRequest:XHR,ArrayBuffer,Uint8Array,Promise});
  const data=await new window.LayoutDictionaryDownloader('latin','it.dict').load();
  assert.equal(requested,'/js/imes/latin/dictionaries/it.dict');assert.ok(data.byteLength>8);assert.equal(aborted,false);
});
