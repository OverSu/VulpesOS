// Web-standard storage adapter. Schema version is independent of Gecko version.
export class IndexedDBStorage {
  constructor(database) {
    this.database = database;
  }
  static open(name = 'vulpes-services-v1') {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(name, 1);
      req.onupgradeneeded = () => req.result.createObjectStore('settings');
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => db.close();
        resolve(new IndexedDBStorage(db));
      };
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('DATABASE_BLOCKED'));
    });
  }
  get(key) {
    return new Promise((resolve, reject) => {
      const tx = this.database.transaction('settings', 'readonly');
      const req = tx.objectStore('settings').get(key);
      tx.oncomplete = () => resolve(req.result);
      tx.onabort = () => reject(tx.error);
    });
  }
  setMany(entries) {
    return new Promise((resolve, reject) => {
      const tx = this.database.transaction('settings', 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
      const store = tx.objectStore('settings');
      for (const [key, value] of entries) store.put(value, key);
    });
  }
  close() {
    this.database.close();
  }
}
