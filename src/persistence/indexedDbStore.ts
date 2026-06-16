/**
 * IndexedDB implementation of `DocumentStore`.
 *
 * Legacy records were keyed by numeric `Date.now()` ids; new ids are UUID
 * strings. Rather than migrate the database, the stored id keeps its native
 * key type and is normalized to a string only at the interface boundary
 * (`toKey` maps an all-digit id back to a number). This keeps existing
 * paintings intact while exposing a uniform string id.
 */

import { z } from "zod";
import { DocMeta, DocumentStore } from "./DocumentStore";
import { StoredDocument, StoredDocumentSchema } from "./document";

const DocMetaSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  name: z.string(),
  createdAt: z.number(),
});

const META_STORE = "imageMetas";
const IMAGE_STORE = "images";
const THUMBNAIL_STORE = "thumbnails";

class IndexedDbStore implements DocumentStore {
  private db: IDBDatabase | null = null;
  private readonly dbName = "cpaint";
  private ready: Promise<void>;

  constructor() {
    this.ready = this.open();
  }

  private open(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore(META_STORE, { keyPath: "id" });
        db.createObjectStore(THUMBNAIL_STORE);
        db.createObjectStore(IMAGE_STORE);
      };
    });
  }

  /** Map a string id to the key type actually used in IndexedDB. */
  private toKey(id: string): IDBValidKey {
    return /^\d+$/.test(id) ? Number(id) : id;
  }

  private async store(
    names: string | string[],
    mode: IDBTransactionMode
  ): Promise<IDBTransaction> {
    await this.ready;
    if (!this.db) throw new Error("Database not available");
    return this.db.transaction(names, mode);
  }

  async listMetas(): Promise<DocMeta[]> {
    const tx = await this.store(META_STORE, "readonly");
    const rows = await req(tx.objectStore(META_STORE).getAll());
    return rows.map((row) => DocMetaSchema.parse(row));
  }

  async getMeta(id: string): Promise<DocMeta | null> {
    const tx = await this.store(META_STORE, "readonly");
    const row = await req(tx.objectStore(META_STORE).get(this.toKey(id)));
    return row == null ? null : DocMetaSchema.parse(row);
  }

  async getDocument(id: string): Promise<StoredDocument | null> {
    const tx = await this.store(IMAGE_STORE, "readonly");
    const row = await req(tx.objectStore(IMAGE_STORE).get(this.toKey(id)));
    return row == null ? null : StoredDocumentSchema.parse(row);
  }

  async getThumbnail(id: string): Promise<Blob | null> {
    const tx = await this.store(THUMBNAIL_STORE, "readonly");
    const row = await req(tx.objectStore(THUMBNAIL_STORE).get(this.toKey(id)));
    return row instanceof Blob ? row : null;
  }

  async putDocument(
    meta: DocMeta,
    doc: StoredDocument,
    thumbnail: Blob
  ): Promise<void> {
    const key = this.toKey(meta.id);
    const tx = await this.store(
      [META_STORE, IMAGE_STORE, THUMBNAIL_STORE],
      "readwrite"
    );
    // Persist the id in its native key type so re-saving a legacy (numeric)
    // document overwrites its existing record instead of duplicating it.
    tx.objectStore(META_STORE).put({ ...meta, id: key });
    tx.objectStore(IMAGE_STORE).put(doc, key);
    tx.objectStore(THUMBNAIL_STORE).put(thumbnail, key);
    await done(tx);
  }

  async deleteDocument(id: string): Promise<void> {
    const key = this.toKey(id);
    const tx = await this.store(
      [META_STORE, IMAGE_STORE, THUMBNAIL_STORE],
      "readwrite"
    );
    tx.objectStore(META_STORE).delete(key);
    tx.objectStore(IMAGE_STORE).delete(key);
    tx.objectStore(THUMBNAIL_STORE).delete(key);
    await done(tx);
  }

  async clearAll(): Promise<void> {
    await this.ready;
    this.db?.close();
    this.db = null;
    await req(indexedDB.deleteDatabase(this.dbName));
    this.ready = this.open();
  }
}

function req<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export const indexedDbStore: DocumentStore = new IndexedDbStore();
