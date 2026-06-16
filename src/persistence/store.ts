import { DocMeta, DocumentStore } from "./DocumentStore";
import { StoredDocument } from "./document";
import { useGoogleAuth } from "./googleAuth";
import { googleDriveStore } from "./googleDriveStore";
import { indexedDbStore } from "./indexedDbStore";

/**
 * The active document store. Documents live in IndexedDB by default; once the
 * user signs in to Google, reads and writes go to their Drive instead. This is
 * the single swap point for backends — `save.ts` / the file browser only ever
 * see the `DocumentStore` interface.
 */
function active(): DocumentStore {
  return useGoogleAuth.getState().signedIn ? googleDriveStore : indexedDbStore;
}

export const documentStore: DocumentStore = {
  listMetas: () => active().listMetas(),
  getMeta: (id) => active().getMeta(id),
  getDocument: (id) => active().getDocument(id),
  getThumbnail: (id) => active().getThumbnail(id),
  putDocument: (meta: DocMeta, doc: StoredDocument, thumbnail: Blob) =>
    active().putDocument(meta, doc, thumbnail),
  deleteDocument: (id) => active().deleteDocument(id),
  clearAll: () => active().clearAll(),
};
