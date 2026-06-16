/**
 * `.cpaint` container: packs a `StoredDocument` (a structure containing several
 * Blobs) into a single Blob and back, so backends that store one byte stream
 * per document (Google Drive, downloadable files, ...) can persist it.
 *
 * Layout (little-endian):
 *   "CPT1"            4-byte magic
 *   manifestLength    uint32
 *   manifest          UTF-8 JSON: the document with every Blob replaced by
 *                     { "$blob": <index>, "type": <mime> }
 *   blobCount         uint32
 *   blobLengths       blobCount × uint32
 *   blobBytes         the blobs, concatenated in index order
 *
 * Zero dependencies; the format is internal and versioned by the magic tag.
 */

import { StoredDocument, StoredDocumentSchema } from "./document";

const MAGIC = "CPT1";

export async function packDocument(doc: StoredDocument): Promise<Blob> {
  const blobs: Blob[] = [];
  const manifest = stripBlobs(doc, blobs);
  const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest));

  const head = new DataView(new ArrayBuffer(8));
  for (let i = 0; i < 4; i++) head.setUint8(i, MAGIC.charCodeAt(i));
  head.setUint32(4, manifestBytes.length, true);

  const table = new DataView(new ArrayBuffer(4 + blobs.length * 4));
  table.setUint32(0, blobs.length, true);
  blobs.forEach((blob, i) => table.setUint32(4 + i * 4, blob.size, true));

  return new Blob([head.buffer, manifestBytes, table.buffer, ...blobs]);
}

export async function unpackDocument(file: Blob): Promise<StoredDocument> {
  const buf = await file.arrayBuffer();
  const view = new DataView(buf);

  for (let i = 0; i < 4; i++) {
    if (view.getUint8(i) !== MAGIC.charCodeAt(i)) {
      throw new Error("Not a .cpaint file");
    }
  }

  let offset = 4;
  const manifestLength = view.getUint32(offset, true);
  offset += 4;
  const manifest = JSON.parse(
    new TextDecoder().decode(new Uint8Array(buf, offset, manifestLength))
  );
  offset += manifestLength;

  const blobCount = view.getUint32(offset, true);
  offset += 4;
  const lengths: number[] = [];
  for (let i = 0; i < blobCount; i++) {
    lengths.push(view.getUint32(offset, true));
    offset += 4;
  }

  const parts: Blob[] = [];
  for (const length of lengths) {
    parts.push(file.slice(offset, offset + length));
    offset += length;
  }

  return StoredDocumentSchema.parse(restoreBlobs(manifest, parts));
}

type BlobRef = { $blob: number; type: string };

function isBlobRef(value: unknown): value is BlobRef {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as BlobRef).$blob === "number"
  );
}

/** Deep-replace every Blob with a reference, collecting blobs in order. */
function stripBlobs(value: unknown, blobs: Blob[]): unknown {
  if (value instanceof Blob) {
    blobs.push(value);
    return { $blob: blobs.length - 1, type: value.type } satisfies BlobRef;
  }
  if (Array.isArray(value)) return value.map((v) => stripBlobs(v, blobs));
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, stripBlobs(v, blobs)])
    );
  }
  return value;
}

/** Inverse of `stripBlobs`: rehydrate references back into typed Blobs. */
function restoreBlobs(value: unknown, parts: Blob[]): unknown {
  if (isBlobRef(value)) {
    return new Blob([parts[value.$blob]], { type: value.type });
  }
  if (Array.isArray(value)) return value.map((v) => restoreBlobs(v, parts));
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, restoreBlobs(v, parts)])
    );
  }
  return value;
}
