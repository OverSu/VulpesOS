import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const context = {window:{}, Blob, Date, btoa, atob, Uint8Array};
vm.runInNewContext(readFileSync(new URL('../host/settings-codec.js',import.meta.url),'utf8'),context);
const codec=context.window.VulpesSettingsCodec;
test('native media replies retain the structured-cloned Blob and date', async()=>{
  const blob=new Blob(['jpeg bytes'],{type:'image/jpeg'}), date=new Date();
  const result=codec.decode({blob,lastModified:date});
  assert.equal(result.blob,blob);
  assert.equal(result.lastModified,date);
  assert.equal(await result.blob.text(),'jpeg bytes');
});
test('Android JSON media and settings still round-trip binary content',async()=>{
  const source=new Blob([new Uint8Array([0,128,255,10])],{type:'image/png'});
  const wire=JSON.parse(JSON.stringify(await codec.encode({photo:source})));
  const result=codec.decode(wire);
  assert.equal(result.photo.type,'image/png');
  assert.deepEqual(new Uint8Array(await result.photo.arrayBuffer()),new Uint8Array([0,128,255,10]));
});
test('a near-match marker is ordinary data, not an injected Blob',()=>{
  const result=codec.decode({__vulpesBlobV1:true,type:'image/png',base64:'AA==',other:1});
  assert.equal(result.other,1);
  assert.equal(result instanceof Blob,false);
});

test('Android contact birthdays keep their ISO date instead of becoming empty objects',async()=>{
  const date=new Date('1995-08-19T00:00:00.000Z');
  const wire=await codec.encode({bday:date,photo:[new Blob(['portrait'],{type:'image/jpeg'})]});
  const result=codec.decode(JSON.parse(JSON.stringify(wire)));
  assert.equal(result.bday,date.toISOString());
  assert.equal(await result.photo[0].text(),'portrait');
});
