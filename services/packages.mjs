// Archived Marketplace packages run as ordinary web apps, never certified Gaia apps.
const MAX_ZIP = 16 * 1024 * 1024, MAX_FILES = 2048, MAX_EXPANDED = 48 * 1024 * 1024;
export function packageURL(value) {
  const url = new URL(value);
  if (url.origin !== 'https://vulpes-os.org' || url.pathname !== '/marketplace/index.php' ||
      !/^\d{1,10}$/.test(url.searchParams.get('download') || '') || url.username || url.password)
    throw Error('INVALID_PACKAGE_URL');
  return url.origin+url.pathname+'?download='+url.searchParams.get('download');
}
async function bounded(stream, limit) {
  const reader=stream.getReader(), chunks=[]; let size=0;
  try { for (;;) {const {done,value}=await reader.read();if(done)break;size+=value.length;
    if(size>limit)throw Error('PACKAGE_TOO_LARGE');chunks.push(value);}
  } finally {await reader.cancel().catch(()=>{});}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;
}
function crc32(bytes) {let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
function base64(bytes) {let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text);}
export async function unpackPackage(bytes, source) {
  packageURL(source);
  if(bytes.length>MAX_ZIP)throw Error('PACKAGE_TOO_LARGE');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength), decoder=new TextDecoder('utf-8',{fatal:true});
  let end=-1;
  for(let p=bytes.length-22;p>=Math.max(0,bytes.length-65557);p--)
    if(view.getUint32(p,true)===0x06054b50 && p+22+view.getUint16(p+20,true)===bytes.length){end=p;break;}
  if(end<0 || view.getUint16(end+4,true) || view.getUint16(end+6,true))throw Error('INVALID_ZIP');
  const count=view.getUint16(end+10,true), centralSize=view.getUint32(end+12,true),start=view.getUint32(end+16,true);
  if(!count || count>MAX_FILES || start+centralSize!==end || view.getUint16(end+8,true)!==count)throw Error('INVALID_ZIP');
  const files=Object.create(null);let cursor=start,total=0;
  for(let i=0;i<count;i++) {
    if(cursor+46>end || view.getUint32(cursor,true)!==0x02014b50)throw Error('INVALID_ZIP');
    const flags=view.getUint16(cursor+8,true),method=view.getUint16(cursor+10,true),crc=view.getUint32(cursor+16,true),
      packed=view.getUint32(cursor+20,true),size=view.getUint32(cursor+24,true),length=view.getUint16(cursor+28,true),
      extra=view.getUint16(cursor+30,true),comment=view.getUint16(cursor+32,true),attrs=view.getUint32(cursor+38,true),offset=view.getUint32(cursor+42,true);
    if(cursor+46+length+extra+comment>end || flags&1 || ![0,8].includes(method) || ((attrs>>>16)&0xf000)===0xa000)throw Error('UNSUPPORTED_ZIP');
    const name=decoder.decode(bytes.subarray(cursor+46,cursor+46+length));cursor+=46+length+extra+comment;
    if(!name || name.startsWith('/') || name.includes('\\') || /[\x00-\x1f:]/.test(name) || name.split('/').some(p=>p==='..'||p==='.') || name.length>512)throw Error('INVALID_PATH');
    if(name.endsWith('/'))continue;
    if(Object.hasOwn(files,name) || (total+=size)>MAX_EXPANDED || offset+30>start || view.getUint32(offset,true)!==0x04034b50)throw Error('INVALID_ZIP');
    const localName=view.getUint16(offset+26,true),localExtra=view.getUint16(offset+28,true),data=offset+30+localName+localExtra;
    if(data+packed>start || decoder.decode(bytes.subarray(offset+30,offset+30+localName))!==name || view.getUint16(offset+8,true)!==method)throw Error('INVALID_ZIP');
    let content=bytes.subarray(data,data+packed);
    if(method===8)content=await bounded(new Blob([content]).stream().pipeThrough(new DecompressionStream('deflate-raw')),size);
    if(content.length!==size || crc32(content)!==crc)throw Error('CORRUPT_PACKAGE');
    files[name]=base64(content);
  }
  if(cursor!==end || !files['manifest.webapp'])throw Error('MISSING_MANIFEST');
  const original=JSON.parse(decoder.decode(Uint8Array.from(atob(files['manifest.webapp']),c=>c.charCodeAt(0))));
  if(typeof original.name!=='string' || !original.name.trim() || original.name.length>120)throw Error('INVALID_MANIFEST');
  function path(value) {if(typeof value!=='string')throw Error('INVALID_MANIFEST');const u=new URL(value,'https://app.invalid/');
    if(u.origin!=='https://app.invalid' || !Object.hasOwn(files,decodeURIComponent(u.pathname.slice(1))))throw Error('MISSING_APP_FILE');return u.pathname+u.search+u.hash;}
  const launch=path(original.launch_path || '/index.html'),icons={};
  for(const [size,value] of Object.entries(original.icons || {}))if(/^\d+$/.test(size)) {try {icons[size]=path(value);}catch(_){}}
  if(!Object.keys(icons).length)throw Error('MISSING_ICON');
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source));
  const id='user-'+Array.from(new Uint8Array(hash)).map(n=>n.toString(16).padStart(2,'0')).join('').slice(0,24);
  const manifest={name:original.name,description:String(original.description||'').slice(0,1000),version:String(original.version||'1.0').slice(0,60),launch_path:launch,icons,type:'web',permissions:{}};
  return {id,manifest,files,source,bytes:total,requestedPermissions:Object.keys(original.permissions||{})};
}
export class Packages {
  constructor({save,fetchPackage=(...args)=>fetch(...args),uuid=()=>crypto.randomUUID(),changed,schedule=(fn,delay)=>setTimeout(fn,delay),unschedule=id=>clearTimeout(id)}) {Object.assign(this,{save,fetchPackage,uuid,changed,schedule,unschedule});this.pending=new Map();}
  async prepare(url) {
    this.cancel();const controller=this.controller=new AbortController();
    const timer=this.schedule(()=>controller.abort(),60000);
    try {
    const source=packageURL(url),response=await this.fetchPackage(source,{redirect:'error',credentials:'omit',signal:controller.signal});
    if(!response.ok)throw Error('DOWNLOAD_FAILED');
    const item=await unpackPackage(await bounded(response.body,MAX_ZIP),source);
    if(controller.signal.aborted)throw Error('DOWNLOAD_CANCELLED');
    this.pending.clear();const token=this.uuid();this.pending.set(token,{item,expires:Date.now()+300000});
    return {token,name:item.manifest.name,bytes:item.bytes,permissions:item.requestedPermissions};
    } finally {this.unschedule(timer);if(this.controller===controller)this.controller=null;}
  }
  cancel(){this.controller?.abort();this.pending.clear();}
  async install(token) {const row=this.pending.get(token);this.pending.delete(token);if(!row || row.expires<Date.now())throw Error('INSTALL_EXPIRED');
    await this.save(row.item);await this.changed();return row.item.id;}
}
