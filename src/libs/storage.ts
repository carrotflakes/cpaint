// IndexedDB interface for storing image data

export class Storage {
  private db: IDBDatabase | null = null;

  constructor() {
    const request = indexedDB.open("cpaint", 1);
    request.onerror = () => {
      console.error("Failed to open database");
    };
    request.onsuccess = () => {
      this.db = request.result;
    };
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore("imageMetas", { keyPath: 'id' });
      db.createObjectStore("thumbnails");
      db.createObjectStore("images");
    };
  }

  getAllImageMetas() {
    if (!this.db) return;
    const transaction = this.db.transaction(["imageMetas"], "readonly");
    const store = transaction.objectStore("imageMetas");
    const request = store.getAll();
    return new Promise((resolve) => {
      request.onsuccess = () => {
        resolve(request.result);
      };
    })
  }

  getImageMeta(id: number) {
    if (!this.db) return;
    const transaction = this.db.transaction(["imageMetas"], "readonly");
    const store = transaction.objectStore("imageMetas");
    const request = store.get(id);
    return new Promise((resolve) => {
      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  getThumbnail(id: number) {
    if (!this.db) return;
    const transaction = this.db.transaction(["thumbnails"], "readonly");
    const store = transaction.objectStore("thumbnails");
    const request = store.get(id);
    return new Promise((resolve) => {
      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  putImage(meta: {
    id: number,
    name: string,
    createdAt: number,
  }, data: any, thumbnails: any) {
    if (!this.db) return;
    const transaction = this.db.transaction(["images", "imageMetas", "thumbnails"], "readwrite");
    const imageStore = transaction.objectStore("images");
    const imageMetaStore = transaction.objectStore("imageMetas");
    const thumbnailStore = transaction.objectStore("thumbnails");
    imageMetaStore.put(meta);
    imageStore.put(data, meta.id);
    thumbnailStore.put(thumbnails, meta.id);
  }

  getImage(id: number) {
    if (!this.db) return;
    const transaction = this.db.transaction(["images"], "readonly");
    const store = transaction.objectStore("images");
    const request = store.get(id);
    return new Promise((resolve) => {
      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  deleteImage(id: number) {
    if (!this.db) return;
    const transaction = this.db.transaction(["images", "imageMetas", "thumbnails"], "readwrite");
    const imageStore = transaction.objectStore("images");
    const imageMetaStore = transaction.objectStore("imageMetas");
    const thumbnailStore = transaction.objectStore("thumbnails");
    imageStore.delete(id);
    imageMetaStore.delete(id);
    thumbnailStore.delete(id);
  }

  get isReady() {
    return !!this.db;
  }
}

export const storage = new Storage();
