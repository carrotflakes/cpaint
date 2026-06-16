/**
 * Google Drive implementation of `DocumentStore`, storing each document as a
 * single `<name>.cpaint` file in the user's Drive (`drive.file` scope).
 *
 * The logical document id stays our own uuid (`DocMeta.id`); it is written to
 * the Drive file's `appProperties.cpaintId` so the same id is stable across
 * backends. The Drive file id is an internal detail resolved from `cpaintId`
 * (cached in memory).
 */

import { DocMeta, DocumentStore } from "./DocumentStore";
import {
  embeddedThumbnailLength,
  packDocument,
  THUMBNAIL_HEADER_SIZE,
  unpackDocument,
} from "./cpaintFile";
import { StoredDocument } from "./document";
import { getAccessToken } from "./googleAuth";

const FILES_URL = "https://www.googleapis.com/drive/v3/files";
const UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";
const APP_TAG = "cpaint";
const EXT = ".cpaint";

type DriveFile = {
  id: string;
  name: string;
  createdTime?: string;
  appProperties?: { cpaintId?: string };
};

class GoogleDriveStore implements DocumentStore {
  /** cpaintId -> Drive file id */
  private idMap = new Map<string, string>();

  async listMetas(): Promise<DocMeta[]> {
    const files = await this.query(
      `appProperties has { key='app' and value='${APP_TAG}' } and trashed=false`
    );
    return files.map((file) => this.toMeta(file));
  }

  async getMeta(id: string): Promise<DocMeta | null> {
    const file = await this.findByCpaintId(id);
    return file ? this.toMeta(file) : null;
  }

  async getDocument(id: string): Promise<StoredDocument | null> {
    const fileId = await this.resolveFileId(id);
    if (!fileId) return null;
    const res = await authedFetch(`${FILES_URL}/${fileId}?alt=media`);
    return unpackDocument(await res.blob());
  }

  async getThumbnail(id: string): Promise<Blob | null> {
    // The preview is embedded at the start of the .cpaint file, so we fetch
    // just the leading bytes with a Range request instead of the whole file.
    // (Drive's thumbnailLink can't be read cross-origin.)
    try {
      const fileId = await this.resolveFileId(id);
      if (!fileId) return null;
      const header = await this.range(fileId, 0, THUMBNAIL_HEADER_SIZE - 1);
      const length = embeddedThumbnailLength(await header.arrayBuffer());
      if (!length) return null;
      const thumb = await this.range(
        fileId,
        THUMBNAIL_HEADER_SIZE,
        THUMBNAIL_HEADER_SIZE + length - 1
      );
      return new Blob([await thumb.arrayBuffer()], { type: "image/png" });
    } catch {
      return null;
    }
  }

  async putDocument(
    meta: DocMeta,
    doc: StoredDocument,
    thumbnail: Blob
  ): Promise<void> {
    const preview = thumbnail.size > 0 ? await downscale(thumbnail, 256) : undefined;
    const body = await packDocument(doc, preview);
    const metadata = {
      name: meta.name + EXT,
      mimeType: "application/octet-stream",
      appProperties: { app: APP_TAG, cpaintId: meta.id },
    };

    const existing = await this.resolveFileId(meta.id);
    const file = existing
      ? await this.upload("PATCH", `${UPLOAD_URL}/${existing}`, metadata, body)
      : await this.upload("POST", UPLOAD_URL, metadata, body);
    this.idMap.set(meta.id, file.id);
  }

  async deleteDocument(id: string): Promise<void> {
    const fileId = await this.resolveFileId(id);
    if (!fileId) return;
    await authedFetch(`${FILES_URL}/${fileId}`, { method: "DELETE" });
    this.idMap.delete(id);
  }

  async clearAll(): Promise<void> {
    const metas = await this.listMetas();
    await Promise.all(metas.map((meta) => this.deleteDocument(meta.id)));
  }

  private toMeta(file: DriveFile): DocMeta {
    return {
      id: file.appProperties?.cpaintId ?? file.id,
      name: file.name.endsWith(EXT) ? file.name.slice(0, -EXT.length) : file.name,
      createdAt: file.createdTime ? Date.parse(file.createdTime) : Date.now(),
    };
  }

  private async resolveFileId(cpaintId: string): Promise<string | null> {
    const cached = this.idMap.get(cpaintId);
    if (cached) return cached;
    const file = await this.findByCpaintId(cpaintId);
    if (!file) return null;
    this.idMap.set(cpaintId, file.id);
    return file.id;
  }

  private async findByCpaintId(cpaintId: string): Promise<DriveFile | null> {
    const files = await this.query(
      `appProperties has { key='cpaintId' and value='${cpaintId}' } and trashed=false`
    );
    return files[0] ?? null;
  }

  private range(fileId: string, start: number, end: number): Promise<Response> {
    return authedFetch(`${FILES_URL}/${fileId}?alt=media`, {
      headers: { Range: `bytes=${start}-${end}` },
    });
  }

  private async query(q: string): Promise<DriveFile[]> {
    const params = new URLSearchParams({
      q,
      spaces: "drive",
      pageSize: "1000",
      fields: "files(id,name,createdTime,appProperties)",
    });
    const res = await authedFetch(`${FILES_URL}?${params}`);
    const data = (await res.json()) as { files?: DriveFile[] };
    return data.files ?? [];
  }

  private async upload(
    method: "POST" | "PATCH",
    url: string,
    metadata: object,
    body: Blob
  ): Promise<DriveFile> {
    const boundary = "cpaint-" + crypto.randomUUID();
    const multipart = new Blob([
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
      JSON.stringify(metadata),
      `\r\n--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`,
      body,
      `\r\n--${boundary}--`,
    ]);
    const res = await authedFetch(
      `${url}?uploadType=multipart&fields=id,name,createdTime,appProperties`,
      {
        method,
        headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
        body: multipart,
      }
    );
    return (await res.json()) as DriveFile;
  }
}

/** Shrink a full-size thumbnail so the embedded preview stays small. */
async function downscale(blob: Blob, max: number): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = new OffscreenCanvas(width, height);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return canvas.convertToBlob({ type: "image/png" });
}

async function authedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  const res = await fetch(url, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Drive request failed (${res.status}): ${await res.text()}`);
  }
  return res;
}

export const googleDriveStore: DocumentStore = new GoogleDriveStore();
