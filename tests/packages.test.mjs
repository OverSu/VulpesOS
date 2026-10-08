import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {unpackPackage,packageURL,Packages} from '../services/packages.mjs';
const source='https://vulpes-os.org/marketplace/index.php?download=42';
function zip(extra={},manifest={}) {
  return new Uint8Array(execFileSync('python3',['-c',`import sys,io,zipfile,json
b=io.BytesIO();args=json.loads(sys.argv[1])
with zipfile.ZipFile(b,'w',zipfile.ZIP_DEFLATED) as z:
 z.writestr('manifest.webapp',json.dumps(dict(name='Test',launch_path='/index.html',icons={'128':'/icon.png'},**args['manifest'])))
 z.writestr('index.html','<h1>Test</h1>');z.writestr('icon.png',b'icon')
 for name,value in args['extra'].items():z.writestr(name,value)
sys.stdout.buffer.write(b.getvalue())`,JSON.stringify({extra,manifest})]));
}
assert.equal(packageURL(source+'&lang=fr'),source);
for(const url of ['http://vulpes-os.org/marketplace/index.php?download=42','https://evil.test/marketplace/index.php?download=42','https://vulpes-os.org/x?download=42','https://vulpes-os.org/marketplace/index.php?download=../42'])assert.throws(()=>packageURL(url));
const bytes=zip({}, {type:'certified',permissions:{settings:{access:'readwrite'},'webapps-manage':{}}});
const item=await unpackPackage(bytes,source);
assert.equal(item.manifest.type,'web');assert.deepEqual(item.manifest.permissions,{});assert.match(item.id,/^user-[a-f0-9]{24}$/);
for(const name of ['../escape','/absolute','dir/../../escape','dir\\escape','a:b'])await assert.rejects(unpackPackage(zip({[name]:'bad'}),source));
await assert.rejects(unpackPackage(bytes.slice(0,-2),source));
const corrupt=bytes.slice();corrupt[100]^=255;await assert.rejects(unpackPackage(corrupt,source));
let saved=null,changes=0;
const service=new Packages({save:async value=>saved=value,changed:async()=>changes++,uuid:()=> 'token',fetchPackage:async()=>new Response(bytes)});
const prepared=await service.prepare(source);assert.equal(saved,null);assert.equal(prepared.name,'Test');
assert.equal(await service.install(prepared.token),item.id);assert.equal(changes,1);assert.equal(saved.id,item.id);
await assert.rejects(service.install(prepared.token),/INSTALL_EXPIRED/);
console.log('Package URL policy, ZIP boundaries/CRC, permission stripping and one-use confirmation: OK');

// Cancellation during download must not produce a confirmation token.
let finishDownload;
const cancelled=new Packages({save:async()=>assert.fail('unexpected save'),changed:async()=>{},
 fetchPackage:()=>new Promise(resolve=>{finishDownload=resolve;})});
const pending=cancelled.prepare(source);cancelled.cancel();finishDownload(new Response(bytes));
await assert.rejects(pending,/DOWNLOAD_CANCELLED/);assert.equal(cancelled.pending.size,0);
console.log('Cancelled download cannot be installed: OK');
