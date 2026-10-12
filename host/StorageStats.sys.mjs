// SPDX-License-Identifier: MPL-2.0
// Only byte counts for Vulpes-owned storage cross the application boundary.
let pending, cached;
export async function storageStats(app) {
  if(app.id!=='settings')throw Error('PERMISSION_DENIED');
  if(cached && Date.now()-cached.at<5000)return cached.value;
  if(pending)return pending;
  pending=(async()=>{
    async function bytes(path,skip='') {
      if(path===skip || !await IOUtils.exists(path))return 0;
      const file=Cc['@mozilla.org/file/local;1'].createInstance(Ci.nsIFile);file.initWithPath(path);
      if(file.isSymlink())return 0;
      const info=await IOUtils.stat(path);
      if(info.type==='regular')return info.size;
      if(info.type!=='directory')return 0;
      let total=0;
      for(const child of await IOUtils.getChildren(path)) {
        try {total+=await bytes(child,skip);} catch(error) {if(error.name!=='NotFoundError')throw error;}
      }
      return total;
    }
    const profile=PathUtils.profileDir,media=PathUtils.join(profile,'vulpes-media');
    const file=Cc['@mozilla.org/file/local;1'].createInstance(Ci.nsIFile);file.initWithPath(profile);
    const value={free:file.diskSpaceAvailable,apps:await bytes(profile,media),sdcard:await bytes(media),scope:'vulpes-profile'};
    cached={at:Date.now(),value};return value;
  })().finally(()=>{pending=null;});
  return pending;
}
