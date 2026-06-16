/**
 * Backend-agnostic persistence port for paint documents.
 *
 * The paint core and UI depend only on this interface; concrete backends
 * (IndexedDB today, the user's Google Drive later) are swappable
 * implementations. Document ids are strings so any backend can use its own
 * id space (e.g. a Drive file id).
 */

import { StoredDocument } from "./document";

export type DocMeta = {
  id: string;
  name: string;
  createdAt: number;
};

export interface DocumentStore {
  /** All document metadata, for listing in the file browser. */
  listMetas(): Promise<DocMeta[]>;
  getMeta(id: string): Promise<DocMeta | null>;
  getDocument(id: string): Promise<StoredDocument | null>;
  /** Thumbnail is kept separate so the file grid can load previews lazily. */
  getThumbnail(id: string): Promise<Blob | null>;
  putDocument(
    meta: DocMeta,
    doc: StoredDocument,
    thumbnail: Blob
  ): Promise<void>;
  deleteDocument(id: string): Promise<void>;
  /** Remove every document (used by "Delete storage"). */
  clearAll(): Promise<void>;
}
