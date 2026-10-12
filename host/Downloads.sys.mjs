// SPDX-License-Identifier: MPL-2.0
// Download identities belong to Gecko; paths supplied by content are never used.
export class GaiaDownloads {
  constructor() {this.ids=new WeakMap();this.items=new Map();}
  async request(app, params={}) {
    if(!['settings','system'].includes(app.id))throw Error('PERMISSION_DENIED');
    if(!['list','pause','resume','remove','blob'].includes(params.operation))throw Error('INVALID_VALUE');
    const {Downloads}=ChromeUtils.importESModule('resource://gre/modules/Downloads.sys.mjs');
    const list=await Downloads.getList(Downloads.PUBLIC);
    const entries=await list.getAll();
    this.items.clear();
    const rows=entries.map(item=>{
      if(!this.ids.has(item))this.ids.set(item,Services.uuid.generateUUID().toString());
      const id=this.ids.get(item);this.items.set(id,item);
      return {id,url:item.source.url,path:item.target.path,startTime:+item.startTime,
        contentType:item.contentType||'application/octet-stream',currentBytes:item.currentBytes,totalBytes:item.totalBytes,
        state:item.succeeded?'succeeded':item.stopped?'stopped':'downloading'};
    });
    if(params.operation==='list')return rows;
    const item=this.items.get(params.id);if(!item)throw Error('DOWNLOAD_NOT_FOUND');
    if(params.operation==='blob') {
      if(!item.succeeded)throw Error('DOWNLOAD_NOT_COMPLETE');
      return File.createFromFileName(item.target.path);
    }
    if(params.operation==='pause')await item.cancel();
    if(params.operation==='resume')await item.start();
    if(params.operation==='remove') {await item.cancel();await item.finalize(true);if(item.succeeded)await IOUtils.remove(item.target.path,{ignoreAbsent:true});await list.remove(item);}
    return true;
  }
}
