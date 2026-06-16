import { DocumentStore } from "./DocumentStore";
import { indexedDbStore } from "./indexedDbStore";

/**
 * The active document store. This is the single swap point for adding cloud
 * backends later (e.g. a Google Drive store, or a synced store wrapping both).
 */
export const documentStore: DocumentStore = indexedDbStore;
