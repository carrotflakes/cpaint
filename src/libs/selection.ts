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
   * Create selection from canvas ImageData (uses alpha channel)
   */
  static fromImageData(imageData: ImageData): Selection {
    const selection = new Selection(imageData.width, imageData.height);
    for (let i = 0; i < selection.data.length; i++) {
      // Extract alpha channel from RGBA
      selection.data[i] = imageData.data[i * 4 + 3];
    }
    return selection;
  }

  /**
   * Create selection from canvas (uses alpha channel as selection mask)
   */
  static fromCanvas(canvas: OffscreenCanvas): Selection {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return Selection.fromImageData(imageData);
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
  addRect(x: number, y: number, width: number, height: number): void {
    const endX = Math.min(x + width, this.width);
    const endY = Math.min(y + height, this.height);
    const startX = Math.max(0, x);
    const startY = Math.max(0, y);

    for (let py = startY; py < endY; py++) {
      for (let px = startX; px < endX; px++) {
        this.setPixel(px, py, true);
      }
    }
  }

  /**
   * Remove rectangular selection
   */
  removeRect(x: number, y: number, width: number, height: number): void {
    const endX = Math.min(x + width, this.width);
    const endY = Math.min(y + height, this.height);
    const startX = Math.max(0, x);
    const startY = Math.max(0, y);

    for (let py = startY; py < endY; py++) {
      for (let px = startX; px < endX; px++) {
        this.setPixel(px, py, false);
      }
    }
  }

  /**
   * Add elliptical selection
   */
  addEllipse(centerX: number, centerY: number, radiusX: number, radiusY: number): void {
    const minX = Math.max(0, Math.floor(centerX - radiusX));
    const maxX = Math.min(this.width - 1, Math.ceil(centerX + radiusX));
    const minY = Math.max(0, Math.floor(centerY - radiusY));
    const maxY = Math.min(this.height - 1, Math.ceil(centerY + radiusY));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = (x - centerX) / radiusX;
        const dy = (y - centerY) / radiusY;
        if (dx * dx + dy * dy <= 1) {
          this.setPixel(x, y, true);
        }
      }
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
  combine(other: Selection, operation: 'add' | 'subtract' | 'intersect' | 'xor'): void {
    if (other.width !== this.width || other.height !== this.height) {
      throw new Error("Selection dimensions must match");
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
   * Get raw data for serialization
   */
  getData(): Uint8Array {
    return new Uint8Array(this.data);
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

  /**
   * Add lasso selection for area enclosed by path
   */
  addLasso(path: Array<{ x: number, y: number }>): void {
    if (path.length < 3) {
      return; // Need at least 3 points to form a polygon
    }

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

    // Check each pixel in the bounding box
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (isPointInPolygon(x, y, path)) {
          this.setPixel(x, y, true);
        }
      }
    }
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
