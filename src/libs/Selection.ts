export type Operation = "new" | 'add' | 'subtract' | 'intersect' | 'xor';

export type Storable = {
  width: number;
  height: number;
  data: Blob;
};

/**
 * Canvas selection model for pixel-level binary selection data
 * Supports efficient selection operations and memory-optimized storage
 */
export class Selection {
  private data: Uint8Array;
  private width: number;
  private height: number;

  constructor(width: number, height: number, initialValue: boolean = false) {
    this.width = width;
    this.height = height;
    // Use Uint8Array for byte-level access (0 = not selected, 255 = selected)
    this.data = new Uint8Array(width * height);
    if (initialValue) {
      this.data.fill(255);
    }
  }

  /**
   * Create selection from existing data
   */
  static fromData(width: number, height: number, data: Uint8Array): Selection {
    const selection = new Selection(width, height);
    selection.data = new Uint8Array(data);
    return selection;
  }

  /**
   * Renew the Selection with the same data
   */
  renew(): Selection {
    const newSelection = new Selection(0, 0);
    newSelection.width = this.width;
    newSelection.height = this.height;
    newSelection.data = this.data;
    return newSelection;
  }

  /**
   * Get selection state at specific pixel
   */
  getPixel(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return false;
    }
    const index = y * this.width + x;
    return this.data[index] > 0;
  }

  /**
   * Set selection state at specific pixel
   */
  setPixel(x: number, y: number, selected: boolean): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return;
    }
    const index = y * this.width + x;
    this.data[index] = selected ? 255 : 0;
  }

  /**
   * Clear all selection
   */
  clear(): void {
    this.data.fill(0);
  }

  /**
   * Select all pixels
   */
  selectAll(): void {
    this.data.fill(255);
  }

  /**
   * Invert selection
   */
  invert(): void {
    for (let i = 0; i < this.data.length; i++) {
      this.data[i] = this.data[i] > 0 ? 0 : 255;
    }
  }

  /**
   * Add rectangular selection
   */
  addRect(x: number, y: number, width: number, height: number, operation: Operation): void {
    const endX = Math.min(x + width, this.width);
    const endY = Math.min(y + height, this.height);
    const startX = Math.max(0, x);
    const startY = Math.max(0, y);

    switch (operation) {
      case 'new':
        this.clear(); // Clear existing selection
        for (let py = startY; py < endY; py++)
          for (let px = startX; px < endX; px++)
            this.setPixel(px, py, true);
        break;
      case 'add':
        for (let py = startY; py < endY; py++)
          for (let px = startX; px < endX; px++)
            this.setPixel(px, py, true);
        break;
      case 'subtract':
        for (let py = startY; py < endY; py++)
          for (let px = startX; px < endX; px++)
            this.setPixel(px, py, false);
        break;
      case 'xor':
        for (let py = startY; py < endY; py++)
          for (let px = startX; px < endX; px++)
            this.setPixel(px, py, !this.getPixel(px, py));
        break;
      case 'intersect':
        for (let py = 0; py < this.height; py++)
          for (let px = 0; px < this.width; px++)
            if (!(px >= startX && px < endX && py >= startY && py < endY))
              this.setPixel(px, py, false);
        break;
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }

  /**
   * Add elliptical selection
   */
  addEllipse(centerX: number, centerY: number, radiusX: number, radiusY: number, operation: Operation): void {
    const minX = Math.max(0, Math.floor(centerX - radiusX));
    const maxX = Math.min(this.width - 1, Math.ceil(centerX + radiusX));
    const minY = Math.max(0, Math.floor(centerY - radiusY));
    const maxY = Math.min(this.height - 1, Math.ceil(centerY + radiusY));

    const fill = (value: boolean) => {
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const dx = (x - centerX) / radiusX;
          const dy = (y - centerY) / radiusY;
          if (dx * dx + dy * dy <= 1) {
            this.setPixel(x, y, value);
          }
        }
      }
    }

    switch (operation) {
      case 'new':
        this.clear(); // Clear existing selection
        fill(true);
        break;
      case 'add':
        fill(true);
        break;
      case 'subtract':
        fill(false);
        break;
      case 'xor':
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            const dx = (x - centerX) / radiusX;
            const dy = (y - centerY) / radiusY;
            if (dx * dx + dy * dy <= 1) {
              this.setPixel(x, y, !this.getPixel(x, y));
            }
          }
        }
        break;
      case 'intersect':
        for (let y = 0; y < this.height; y++) {
          for (let x = 0; x < this.width; x++) {
            const dx = (x - centerX) / radiusX;
            const dy = (y - centerY) / radiusY;
            if (!(dx * dx + dy * dy <= 1)) {
              this.setPixel(x, y, false);
            }
          }
        }
        break;
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }

  /**
   * Magic wand selection based on color similarity
   */
  addMagicWand(
    sourceCanvas: OffscreenCanvas,
    startX: number,
    startY: number,
    tolerance: number = 0
  ): void {
    const ctx = sourceCanvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, this.width, this.height);
    const visited = new Set<number>();
    const queue: [number, number][] = [[startX, startY]];

    // Get target color
    const targetIndex = (startY * this.width + startX) * 4;
    const targetR = imageData.data[targetIndex];
    const targetG = imageData.data[targetIndex + 1];
    const targetB = imageData.data[targetIndex + 2];
    const targetA = imageData.data[targetIndex + 3];

    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      const index = y * this.width + x;

      if (visited.has(index) || x < 0 || x >= this.width || y < 0 || y >= this.height) {
        continue;
      }

      visited.add(index);

      // Check color similarity
      const pixelIndex = index * 4;
      const r = imageData.data[pixelIndex];
      const g = imageData.data[pixelIndex + 1];
      const b = imageData.data[pixelIndex + 2];
      const a = imageData.data[pixelIndex + 3];

      const diff = Math.abs(r - targetR) + Math.abs(g - targetG) +
        Math.abs(b - targetB) + Math.abs(a - targetA);

      if (diff <= tolerance * 4) {
        this.setPixel(x, y, true);
        // Add neighboring pixels to queue
        queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
    }
  }

  /**
   * Combine with another selection using specified operation
   */
  combine(other: Selection, operation: Operation): void {
    if (other.width !== this.width || other.height !== this.height) {
      throw new Error("Selection dimensions must match");
    }

    if (operation === 'new') {
      for (let i = 0; i < this.data.length; i++)
        this.data[i] = other.data[i];
      return;
    }

    for (let i = 0; i < this.data.length; i++) {
      const thisSelected = this.data[i] > 0;
      const otherSelected = other.data[i] > 0;
      let result: boolean;

      switch (operation) {
        case 'add':
          result = thisSelected || otherSelected;
          break;
        case 'subtract':
          result = thisSelected && !otherSelected;
          break;
        case 'intersect':
          result = thisSelected && otherSelected;
          break;
        case 'xor':
          result = thisSelected !== otherSelected;
          break;
      }

      this.data[i] = result ? 255 : 0;
    }
  }

  /**
   * Check if selection is empty
   */
  isEmpty(): boolean {
    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i] > 0) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get bounding box of selection
   */
  getBounds(): { x: number; y: number; width: number; height: number } | null {
    let minX = this.width, minY = this.height;
    let maxX = -1, maxY = -1;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.getPixel(x, y)) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }

    if (maxX === -1) {
      return null; // Empty selection
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1
    };
  }

  /**
   * Clone the selection
   */
  clone(): Selection {
    return Selection.fromData(this.width, this.height, this.data);
  }

  /**
   * Get dimensions
   */
  getSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  /**
   * Apply feathering (blur) to selection edges
   */
  feather(radius: number): void {
    if (radius <= 0) return;

    const originalData = new Uint8Array(this.data);
    const kernel = createGaussianKernel(radius);
    const kernelSize = kernel.length;
    const halfKernel = Math.floor(kernelSize / 2);

    // Apply horizontal blur
    const tempData = new Uint8Array(this.data.length);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        let sum = 0;
        let weightSum = 0;

        for (let kx = 0; kx < kernelSize; kx++) {
          const sourceX = x + kx - halfKernel;
          if (sourceX >= 0 && sourceX < this.width) {
            const weight = kernel[kx];
            sum += originalData[y * this.width + sourceX] * weight;
            weightSum += weight;
          }
        }

        tempData[y * this.width + x] = weightSum > 0 ? sum / weightSum : 0;
      }
    }

    // Apply vertical blur
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        let sum = 0;
        let weightSum = 0;

        for (let ky = 0; ky < kernelSize; ky++) {
          const sourceY = y + ky - halfKernel;
          if (sourceY >= 0 && sourceY < this.height) {
            const weight = kernel[ky];
            sum += tempData[sourceY * this.width + x] * weight;
            weightSum += weight;
          }
        }

        this.data[y * this.width + x] = weightSum > 0 ? Math.round(sum / weightSum) : 0;
      }
    }
  }

  toPath(): string {
    // '∪'s
    const uPaths: { start: number, end: number, path: [number, number][] }[] = [];
    // '|'s
    const paths: { start: number, path: [number, number][] }[] = [];
    let id = 0;

    for (let y = -1; y < this.height; y++) {
      let pathsI = 0;
      let flg1 = false;
      let flg2 = false;
      let x1: number | null = null;
      let x2: number | null = null;
      for (let x = 0; x < this.width + 1; x++) {
        if (this.getPixel(x, y) !== flg1) {
          flg1 = !flg1;
          if (x1 === null) {
            x1 = x;
          } else {
            // ∪
            paths[pathsI].path.push([x1, y + 1]);
            paths[pathsI + 1].path.push([x, y + 1]);
            const ps = paths.splice(pathsI, 2);
            uPaths.push({ start: ps[0].start, end: ps[1].start, path: [...ps[0].path, ...ps[1].path.reverse()] });
            x1 = null;
          }
        }
        if (this.getPixel(x, y + 1) !== flg2) {
          flg2 = !flg2;
          if (x2 === null) {
            x2 = x;
          } else {
            // ∩
            paths.splice(pathsI, 0, { start: id, path: [[x2, y + 1]] }, { start: id, path: [[x, y + 1]] });
            id++;
            pathsI += 2;
            x2 = null;
          }
        }
        if (x1 !== null && x2 !== null) {
          // |
          if (x1 === x2)
            paths[pathsI++].path.push([x1, y + 1]);
          else
            paths[pathsI++].path.push([x1, y + 1], [x2, y + 1]);
          x1 = null;
          x2 = null;
        }
      }
    }

    /* uPaths to loops */
    const loops: [number, number][][] = [];
    while (uPaths.length > 0) {
      const uPath = uPaths.pop()!;
      const start = uPath.start;
      const end = uPath.end;
      const path = uPath.path;

      if (start === end) {
        loops.push(path);
        continue;
      }

      const next = uPaths.find(p => p.start === end);
      if (next) {
        next.start = start;
        next.path.unshift(...path);
      } else {
        const next = uPaths.find(p => p.end === end)!;
        next.end = start;
        next.path.push(...path.reverse());
      }
    }

    return loops.map(loop => loop.map((p, i) => (i === 0 ? 'M' : 'L') + p).join(' ') + ' Z').join(' ');
  }

  addPaint(path: Array<{ x: number, y: number }>, brushSize: number): void {
    if (path.length === 0) return;

    const radius = brushSize / 2;

    // Draw circles along the path
    for (const point of path) {
      this.addCircle(point.x, point.y, radius);
    }

    // Connect circles along the path for continuous stroke
    for (let i = 0; i < path.length - 1; i++) {
      const p1 = path[i];
      const p2 = path[i + 1];
      this.addLine(p1.x, p1.y, p2.x, p2.y, radius);
    }
  }

  private addCircle(centerX: number, centerY: number, radius: number): void {
    const minX = Math.max(0, Math.floor(centerX - radius));
    const maxX = Math.min(this.width - 1, Math.ceil(centerX + radius));
    const minY = Math.max(0, Math.floor(centerY - radius));
    const maxY = Math.min(this.height - 1, Math.ceil(centerY + radius));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        if (dx * dx + dy * dy <= radius * radius) {
          this.setPixel(x, y, true);
        }
      }
    }
  }

  private addLine(x1: number, y1: number, x2: number, y2: number, radius: number): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return;

    const steps = Math.ceil(distance);
    const stepX = dx / steps;
    const stepY = dy / steps;

    for (let i = 0; i <= steps; i++) {
      const x = x1 + stepX * i;
      const y = y1 + stepY * i;
      this.addCircle(x, y, radius);
    }
  }

  /**
   * Add lasso selection for area enclosed by path
   */
  addLasso(path: Array<{ x: number, y: number }>, operation: Operation): void {
    // Need at least 3 points to form a polygon
    if (path.length < 3)
      return;

    // Get bounding box of the path to optimize iteration
    let minX = Math.floor(Math.min(...path.map(p => p.x)));
    let maxX = Math.ceil(Math.max(...path.map(p => p.x)));
    let minY = Math.floor(Math.min(...path.map(p => p.y)));
    let maxY = Math.ceil(Math.max(...path.map(p => p.y)));

    // Clamp to canvas bounds
    minX = Math.max(0, minX);
    maxX = Math.min(this.width - 1, maxX);
    minY = Math.max(0, minY);
    maxY = Math.min(this.height - 1, maxY);

    const fill = (value: boolean) => {
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          if (isPointInPolygon(x, y, path)) {
            this.setPixel(x, y, value);
          }
        }
      }
    };

    switch (operation) {
      case 'new':
        this.clear(); // Clear existing selection
        fill(true);
        break;
      case 'add':
        fill(true);
        break;
      case 'subtract':
        fill(false);
        break;
      case 'xor':
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            if (isPointInPolygon(x, y, path)) {
              this.setPixel(x, y, !this.getPixel(x, y));
            }
          }
        }
        break;
      case 'intersect':
        for (let y = 0; y < this.height; y++) {
          for (let x = 0; x < this.width; x++) {
            if (!isPointInPolygon(x, y, path)) {
              this.setPixel(x, y, false);
            }
          }
        }
        break;
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }

  /**
   * Clip ImageData to selection area
   * This modifies the imageData in place, setting non-selected pixels to transparent
   */
  clipImageData(imageData: ImageData) {
    if (imageData.width !== this.width || imageData.height !== this.height) {
      throw new Error("ImageData dimensions must match selection dimensions");
    }

    for (let i = 0; i < this.data.length; i++) {
      const isSelected = this.data[i] > 0;
      const pixelIndex = i * 4;

      if (!isSelected) {
        imageData.data[pixelIndex] = 0;
        imageData.data[pixelIndex + 1] = 0;
        imageData.data[pixelIndex + 2] = 0;
        imageData.data[pixelIndex + 3] = 0;
      }
    }
  }

  /**
   * Transfer selected pixels to another imageData
   */
  transferImageData(imageDataSrc: ImageData, imageDataDst: ImageData): void {
    if (imageDataSrc.width !== this.width || imageDataSrc.height !== this.height ||
      imageDataDst.width !== this.width || imageDataDst.height !== this.height) {
      throw new Error("ImageData dimensions must match selection dimensions");
    }

    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i] > 0) {
        const idx = i * 4;

        imageDataDst.data[idx] = imageDataSrc.data[idx];
        imageDataDst.data[idx + 1] = imageDataSrc.data[idx + 1];
        imageDataDst.data[idx + 2] = imageDataSrc.data[idx + 2];
        imageDataDst.data[idx + 3] = imageDataSrc.data[idx + 3];
      }
    }
  }

  setCanvasClip(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) {
    ctx.beginPath();
    for (let y = 0; y < this.height; y++) {
      let flg = false;
      for (let x = 0; x < this.width + 1; x++) {
        if (this.getPixel(x, y) !== flg) {
          flg = !flg;
          if (flg) {
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + 1);
          } else {
            ctx.lineTo(x, y + 1);
            ctx.lineTo(x, y);
          }
        }
      }
    }
    ctx.clip();
  }

  toStorable(): Storable {
    const blob = new Blob([this.data], { type: 'application/octet-stream' });
    return {
      width: this.width,
      height: this.height,
      data: blob
    };
  }

  static async fromStorable(storable: Storable): Promise<Selection> {
    return new Promise<Selection>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const data = new Uint8Array(reader.result as ArrayBuffer);
        resolve(Selection.fromData(storable.width, storable.height, data));
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(storable.data);
    });
  }
}

/**
 * Create Gaussian kernel for feathering
 */
function createGaussianKernel(radius: number): number[] {
  const size = Math.ceil(radius * 2) * 2 + 1;
  const kernel = new Array(size);
  const sigma = radius / 3;
  const sigmaSq = sigma * sigma;
  const center = Math.floor(size / 2);

  let sum = 0;
  for (let i = 0; i < size; i++) {
    const x = i - center;
    const value = Math.exp(-(x * x) / (2 * sigmaSq));
    kernel[i] = value;
    sum += value;
  }

  // Normalize
  for (let i = 0; i < size; i++) {
    kernel[i] /= sum;
  }

  return kernel;
}

/**
 * Check if point is inside polygon using ray casting algorithm
 */
function isPointInPolygon(x: number, y: number, polygon: Array<{ x: number, y: number }>): boolean {
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    // Check if ray crosses edge
    if (((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }

  return inside;
}
