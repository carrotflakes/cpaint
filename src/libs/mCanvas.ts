/**
 * A wrapper class for OffscreenCanvas that provides additional functionality
 * including bounding box calculation and caching for opaque pixels
 */
export class MCanvas {
  private canvas: OffscreenCanvas;
  private _bbox: { x: number; y: number; width: number; height: number } | null = null;
  private _bboxDirty = true;

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
    this.markBboxDirty();
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

  markBboxDirty(): void {
    this._bboxDirty = true;
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

  clear(): void {
    const ctx = this.getContextRead();
    ctx.clearRect(0, 0, this.width, this.height);
    this._bbox = null;
    this._bboxDirty = false;
  }
}
