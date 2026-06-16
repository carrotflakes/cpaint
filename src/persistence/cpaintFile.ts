/**
 * `.cpaint` container: packs a `StoredDocument` (a structure containing several
 * Blobs) into a single Blob and back, so backends that store one byte stream
 * per document (Google Drive, downloadable files, ...) can persist it.
 *
 * A small preview thumbnail is embedded at the very start so a backend can read
 * just the leading bytes (e.g. an HTTP Range request) to show a preview without
 * downloading the whole document.
 *
 * Layout (little-endian):
 *   "CPT2"            4-byte magic
 *   thumbnailLength   uint32
 *   thumbnail         PNG bytes (may be empty)
 *   --- document body ---
 *   manifestLength    uint32
 *   manifest          UTF-8 JSON: the document with every Blob replaced by
 *                     { "$blob": <index>, "type": <mime> }
 *   blobCount         uint32
 *   blobLengths       blobCount × uint32
 *   blobBytes         the blobs, concatenated in index order
 *
 * "CPT1" (no thumbnail header; body starts right after the magic) is still
 * accepted for reading. Zero dependencies.
 */

import { StoredDocument, StoredDocumentSchema } from "./document";

const MAGIC_V2 = "CPT2";
const MAGIC_V1 = "CPT1";

/** Size of the leading "CPT2" + thumbnailLength header. */
export const THUMBNAIL_HEADER_SIZE = 8;

export async function packDocument(
  doc: StoredDocument,
  thumbnail?: Blob
): Promise<Blob> {
  const blobs: Blob[] = [];
  const manifest = stripBlobs(doc, blobs);
  const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest));
  const thumbBytes = thumbnail
    ? new Uint8Array(await thumbnail.arrayBuffer())
    : new Uint8Array(0);

  const header = new DataView(new ArrayBuffer(THUMBNAIL_HEADER_SIZE));
  writeMagic(header, MAGIC_V2);
  header.setUint32(4, thumbBytes.length, true);

  const manifestLength = new DataView(new ArrayBuffer(4));
  manifestLength.setUint32(0, manifestBytes.length, true);

  const table = new DataView(new ArrayBuffer(4 + blobs.length * 4));
  table.setUint32(0, blobs.length, true);
  blobs.forEach((blob, i) => table.setUint32(4 + i * 4, blob.size, true));

  return new Blob([
    header.buffer,
    thumbBytes,
    manifestLength.buffer,
    manifestBytes,
    table.buffer,
    ...blobs,
  ]);
}

export async function unpackDocument(file: Blob): Promise<StoredDocument> {
  const buf = await file.arrayBuffer();
  const view = new DataView(buf);

  const magic = readMagic(view);
  let offset: number;
  if (magic === MAGIC_V2) {
    offset = THUMBNAIL_HEADER_SIZE + view.getUint32(4, true);
  } else if (magic === MAGIC_V1) {
    offset = 4;
  } else {
    throw new Error("Not a .cpaint file");
  }

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

/**
 * Read the embedded thumbnail length from the leading header bytes (0 if the
 * document has no embedded thumbnail). Pass the first `THUMBNAIL_HEADER_SIZE`
 * bytes of the file.
 */
export function embeddedThumbnailLength(header: ArrayBuffer): number {
  if (header.byteLength < THUMBNAIL_HEADER_SIZE) return 0;
  const view = new DataView(header);
  return readMagic(view) === MAGIC_V2 ? view.getUint32(4, true) : 0;
}

function writeMagic(view: DataView, magic: string) {
  for (let i = 0; i < 4; i++) view.setUint8(i, magic.charCodeAt(i));
}

function readMagic(view: DataView): string {
  return String.fromCharCode(
    view.getUint8(0),
    view.getUint8(1),
    view.getUint8(2),
    view.getUint8(3)
  );
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
