/**
 * A wrapper class for OffscreenCanvas that provides additional functionality
 * including bounding box calculation and caching for opaque pixels
 */
export class MCanvas {
  private canvas: OffscreenCanvas;
  private _bbox: { x: number; y: number; width: number; height: number } | null = null;
  private _bboxDirty = true;
  private _thumbnail: ImageBitmap | null = null;
  private _version = Symbol();

  constructor(width: number, height: number);
  constructor(canvas: OffscreenCanvas);
  constructor(widthOrCanvas: number | OffscreenCanvas, height?: number) {
    if (typeof widthOrCanvas === 'number') {
      this.canvas = new OffscreenCanvas(widthOrCanvas, height!);
    } else {
      this.canvas = widthOrCanvas;
    }
  }

  get width(): number {
    return this.canvas.width;
  }

  get height(): number {
    return this.canvas.height;
  }

  getContextRead(): OffscreenCanvasRenderingContext2D {
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('Failed to get 2D context from OffscreenCanvas');
    }
    return ctx;
  }

  getContextWrite(): OffscreenCanvasRenderingContext2D {
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('Failed to get 2D context from OffscreenCanvas');
    }
    this.markDirty();
    return ctx;
  }

  /**
   * Get the bounding box that contains all opaque pixels
   * Returns null if no opaque pixels are found
   */
  getBbox(): { x: number; y: number; width: number; height: number } | null {
    if (this._bboxDirty) {
      this._bbox = this.calculateBbox();
      this._bboxDirty = false;
    }

    return this._bbox ? { ...this._bbox } : null;
  }

  /**
   * Get the current version symbol of the canvas content
   * This symbol changes every time the canvas content is modified
   */
  getVersion(): symbol {
    return this._version;
  }

  markDirty(): void {
    this._bboxDirty = true;
    this._thumbnail = null;
    this._version = Symbol();
  }

  private calculateBbox(): { x: number; y: number; width: number; height: number } | null {
    const ctx = this.getContextRead();
    const imageData = ctx.getImageData(0, 0, this.width, this.height);
    const data = imageData.data;

    let minX = this.width;
    let minY = this.height;
    let maxX = -1;
    let maxY = -1;

    // Scan all pixels to find opaque ones (alpha > 0)
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const alpha = data[(y * this.width + x) * 4 + 3];
        if (alpha > 0) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    if (maxX === -1)
      return null;

    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    };
  }

  getCanvas(): OffscreenCanvas {
    return this.canvas;
  }

  clear() {
    const ctx = this.getContextRead();
    ctx.clearRect(0, 0, this.width, this.height);
    this._bboxDirty = false;
    this._bbox = null;
    this._thumbnail = null;
    this._version = Symbol();
  }

  getThumbnail(): ImageBitmap {
    if (!this._thumbnail)
      this._thumbnail = createThumbnail(this);
    return this._thumbnail;
  }

  clone(): MCanvas {
    const clonedCanvas = new MCanvas(this.canvas.width, this.canvas.height);
    const ctx = clonedCanvas.getContextWrite();
    ctx.drawImage(this.canvas, 0, 0);
    clonedCanvas._bbox = this._bbox;
    clonedCanvas._bboxDirty = this._bboxDirty;
    clonedCanvas._thumbnail = this._thumbnail;
    clonedCanvas._version = this._version;
    return clonedCanvas;
  }
}

export const THUMBNAIL_SIZE = 64;

function createThumbnail(canvas: MCanvas, width = THUMBNAIL_SIZE, height = THUMBNAIL_SIZE): ImageBitmap {
  const bbox = canvas.getBbox();
  if (bbox) {
    const scale = Math.min(
      width / bbox.width,
      height / bbox.height
    );

    const thumbnailCanvas = new OffscreenCanvas(Math.ceil(bbox.width * scale), Math.ceil(bbox.height * scale));
    const thumbnailCtx = thumbnailCanvas.getContext('2d', { willReadFrequently: true })!;

    thumbnailCtx.imageSmoothingQuality = 'high';
    thumbnailCtx.drawImage(
      canvas.getCanvas(),
      bbox.x,
      bbox.y,
      bbox.width,
      bbox.height,
      0,
      0,
      bbox.width * scale,
      bbox.height * scale,
    );
    return thumbnailCanvas.transferToImageBitmap();
  } else {
    const thumbnailCanvas = new OffscreenCanvas(1, 1);
    thumbnailCanvas.getContext('2d', { willReadFrequently: true })!;
    return thumbnailCanvas.transferToImageBitmap();
  }
}
