
function enumerateAll(storages,dir,options){var storageIndex=0;var ds_cursor=null;var cursor={continue:function cursor_continue(){ds_cursor.continue();}};function onsuccess(e){cursor.result=e.target.result;if(!cursor.result){storageIndex++;if(storageIndex<storages.length){enumerateNextStorage();return;}}
if(cursor.onsuccess){try{cursor.onsuccess(e);}catch(err){console.warn('enumerateAll onsuccess threw',err);}}}
function onerror(e){cursor.error=e.target.error;if(cursor.error.name==='NotFoundError'&&storageIndex!==storages.length-1){storageIndex++;enumerateNextStorage();return;}
if(cursor.onerror){try{cursor.onerror(e);}catch(err){console.warn('enumerateAll onerror threw',err);}}}
function enumerateNextStorage(){ds_cursor=storages[storageIndex].enumerate(dir,options||{});ds_cursor.onsuccess=onsuccess;ds_cursor.onerror=onerror;}
enumerateNextStorage();return cursor;}