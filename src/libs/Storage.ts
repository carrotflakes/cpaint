/**
 * IndexedDB interface for storing image data
*/

import { z } from 'zod';
import { ALL_BLEND_MODES } from '../model/blendMode';

const ImageMetaSchema = z.object({ id: z.number(), name: z.string(), createdAt: z.number() });
type ImageMeta = z.infer<typeof ImageMetaSchema>;

const layerSchema = z.object({
  type: z.literal("layer"),
  id: z.string(),
  canvas: z.instanceof(Blob),
  visible: z.boolean(),
  opacity: z.number().min(0).max(1),
  blendMode: z.enum(ALL_BLEND_MODES),
  locked: z.boolean(),
});

// Define the recursive type using z.lazy
type LayerType = z.infer<typeof layerSchema> | {
  type: "group";
  id: string;
  layers: LayerType[];
  visible: boolean;
  opacity: number;
  blendMode: typeof ALL_BLEND_MODES[number];
  locked: boolean;
};

const layerGroupSchema: z.ZodType<LayerType> = z.lazy(() => z.union([
  layerSchema,
  z.object({
    type: z.literal("group"),
    id: z.string(),
    layers: z.array(layerGroupSchema),
    visible: z.boolean(),
    opacity: z.number().min(0).max(1),
    blendMode: z.enum(ALL_BLEND_MODES),
    locked: z.boolean(),
  })
]));

const ImageDataSchema = z.object({
  layers: z.array(z.union([layerSchema, layerGroupSchema])),
  selection: z.object({
    width: z.number(),
    height: z.number(),
    data: z.instanceof(Blob),
  }).nullable(),
  size: z.object({
    width: z.number(),
    height: z.number(),
  }),
  colorHistory: z.array(z.string()).optional(),
});

export type ImageData = z.infer<typeof ImageDataSchema>;

export class Storage {
  private db: IDBDatabase | null = null;

  private readonly dbName = "cpaint";

  constructor() {
    const request = indexedDB.open(this.dbName, 1);
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
    if (!this.db) throw new Error("Database not initialized");
    const transaction = this.db.transaction(["imageMetas"], "readonly");
    const store = transaction.objectStore("imageMetas");
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        try {
          const results = request.result.map((item) => ImageMetaSchema.parse(item));
          resolve(results);
        } catch (error) {
          reject(error);
        }
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  getImageMeta(id: number): Promise<ImageMeta> {
    if (!this.db) throw new Error("Database not initialized");
    const transaction = this.db.transaction(["imageMetas"], "readonly");
    const store = transaction.objectStore("imageMetas");
    const request = store.get(id);
    return new Promise((resolve) => {
      request.onsuccess = () => {
        const result = request.result;
        if (result == null) {
          resolve(result);
          return;
        }
        const meta = ImageMetaSchema.parse(result);
        resolve(meta);
      };
    });
  }

  getThumbnail(id: number): Promise<Blob | undefined> {
    if (!this.db) throw new Error("Database not initialized");
    const transaction = this.db.transaction(["thumbnails"], "readonly");
    const store = transaction.objectStore("thumbnails");
    const request = store.get(id);
    return new Promise((resolve) => {
      request.onsuccess = () => {
        if (request.result instanceof Blob)
          resolve(request.result);
      };
    });
  }

  putImage(meta: ImageMeta, data: ImageData, thumbnail: Blob) {
    if (!this.db) throw new Error("Database not initialized");
    const transaction = this.db.transaction(["images", "imageMetas", "thumbnails"], "readwrite");
    const imageStore = transaction.objectStore("images");
    const imageMetaStore = transaction.objectStore("imageMetas");
    const thumbnailStore = transaction.objectStore("thumbnails");
    imageMetaStore.put(meta);
    imageStore.put(data, meta.id);
    thumbnailStore.put(thumbnail, meta.id);
  }

  getImage(id: number): Promise<ImageData | null> {
    if (!this.db) throw new Error("Database not initialized");
    const transaction = this.db.transaction(["images"], "readonly");
    const store = transaction.objectStore("images");
    const request = store.get(id);
    return new Promise((resolve) => {
      request.onsuccess = () => {
        const result = request.result;
        if (result == null) {
          resolve(result);
          return;
        }
        const imageData = ImageDataSchema.parse(result);
        resolve(imageData);
      };
      request.onerror = () => {
        console.error("Failed to get image", request.error);
        resolve(null);
      }
    });
  }

  deleteImage(id: number) {
    if (!this.db) throw new Error("Database not initialized");
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

  deleteDatabase() {
    this.db = null;
    indexedDB.deleteDatabase(this.dbName);
  }
}

export const storage = new Storage();
