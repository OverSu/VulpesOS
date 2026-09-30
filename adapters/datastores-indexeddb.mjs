export class DataStoresIndexedDB {
  constructor(factory, keyRange, uuid) {
    Object.assign(this, { factory, keyRange, uuid });
  }
  open() {
    return (this.database ||= new Promise((resolve, reject) => {
      const request = this.factory.open('vulpes-datastores-v1', 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('values');
        request.result.createObjectStore('revisions');
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      };
    }));
  }
  async run(key, operation, args) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const write = ['add', 'put', 'remove', 'clear'].includes(operation);
      const tx = db.transaction(['values', 'revisions'], write ? 'readwrite' : 'readonly');
      const store = tx.objectStore('values'),
        revisions = tx.objectStore('revisions');
      const range = this.keyRange.bound([key], [key, []]);
      let value,
        revisionId = '',
        entries = [];
      tx.onabort = () => reject(tx.error || new Error('TRANSACTION_ABORTED'));
      tx.onerror = () => {};
      tx.oncomplete = () => resolve({ value, revisionId });
      if (operation === 'get') {
        value = [];
        args.forEach((id, index) => {
          store.get([key, id]).onsuccess = (event) => {
            if (args.length === 1) value = event.target.result;
            else value[index] = event.target.result;
          };
        });
      } else if (operation === 'snapshot') {
        revisions.get(key).onsuccess = (event) => {
          revisionId = event.target.result || '';
        };
        store.openCursor(range).onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            entries.push({ id: cursor.key[1], data: cursor.value });
            cursor.continue();
          } else value = { revisionId, entries };
        };
      } else if (operation === 'length') {
        store.count(range).onsuccess = (event) => {
          value = event.target.result;
        };
      } else if (write) {
        revisionId = this.uuid();
        revisions.put(revisionId, key);
        if (operation === 'clear') store.delete(range);
        else if (operation === 'remove') {
          store.count([key, args[0]]).onsuccess = (event) => {
            value = event.target.result > 0;
          };
          store.delete([key, args[0]]);
        } else {
          value = args[1] === undefined ? this.uuid() : args[1];
          store[operation === 'add' ? 'add' : 'put'](args[0], [key, value]);
        }
      } else tx.abort();
    });
  }
}
