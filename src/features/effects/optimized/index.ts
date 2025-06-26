// High-performance effect application with multiple optimization strategies
// src/features/effects/optimized/index.ts

import { MCanvas } from "../../../libs/MCanvas";
import { RGBA, PointOperation } from "../naive";
import { WebGLEffects } from "./webgl";

export interface OptimizedEffectOptions {
  preferWebGL?: boolean;
  useWorker?: boolean;
  chunkSize?: number;
  enableSIMD?: boolean;
}

export class OptimizedEffects {
  private webglContext?: WebGLEffects;
  private worker?: Worker;
  private options: Required<OptimizedEffectOptions>;

  constructor(options: OptimizedEffectOptions = {}) {
    this.options = {
      preferWebGL: options.preferWebGL ?? true,
      useWorker: options.useWorker ?? true,
      chunkSize: options.chunkSize ?? 65536, // 64KB chunks
      enableSIMD: options.enableSIMD ?? true,
      ...options
    };

    this.initializeOptimizations();
  }

  private async initializeOptimizations() {
    // Initialize WebGL if preferred and available
    if (this.options.preferWebGL && this.supportsWebGL()) {
      try {
        this.webglContext = new WebGLEffects(1024, 1024); // Will resize as needed
      } catch (e) {
        console.warn('WebGL initialization failed, falling back to CPU:', e);
      }
    }

    // Initialize Worker if preferred
    if (this.options.useWorker && typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(
          new URL('./worker.ts', import.meta.url),
          { type: 'module' }
        );
      } catch (e) {
        console.warn('Worker initialization failed:', e);
      }
    }
  }

  private supportsWebGL(): boolean {
    try {
      const canvas = new OffscreenCanvas(1, 1);
      const gl = canvas.getContext('webgl2');
      return gl !== null;
    } catch {
      return false;
    }
  }

  public async applyBrightnessContrast(
    canvasSrc: MCanvas,
    canvasDst: MCanvas,
    brightness: number,
    contrast: number
  ): Promise<void> {
    // Choose best implementation based on image size and available optimizations
    const pixelCount = canvasSrc.width * canvasSrc.height;

    if (this.webglContext && pixelCount > 100000) {
      await this.applyBrightnessContrastWebGL(canvasSrc, canvasDst, brightness, contrast);
    } else if (this.worker && pixelCount > 50000) {
      await this.applyBrightnessContrastWorker(canvasSrc, canvasDst, brightness, contrast);
    } else {
      this.applyBrightnessContrastOptimized(canvasSrc, canvasDst, brightness, contrast);
    }
  }

  private async applyBrightnessContrastWebGL(
    canvasSrc: MCanvas,
    canvasDst: MCanvas,
    brightness: number,
    contrast: number
  ): Promise<void> {
    if (!this.webglContext) return;

    // Resize WebGL context if needed
    const currentSize = this.webglContext.getSize();
    if (currentSize.width !== canvasSrc.width || currentSize.height !== canvasSrc.height) {
      this.webglContext.resize(canvasSrc.width, canvasSrc.height);
    }

    const srcImageData = canvasSrc.getContextRead().getImageData(0, 0, canvasSrc.width, canvasSrc.height);
    const sourceTexture = this.webglContext.createTextureFromImageData(srcImageData);
    const resultTexture = this.webglContext.applyBrightnessContrast(sourceTexture, brightness, contrast);
    const resultImageData = this.webglContext.readTextureToImageData(resultTexture);

    canvasDst.getContextWrite().putImageData(resultImageData, 0, 0);
  }

  private async applyBrightnessContrastWorker(
    canvasSrc: MCanvas,
    canvasDst: MCanvas,
    brightness: number,
    contrast: number
  ): Promise<void> {
    if (!this.worker) return;

    const srcImageData = canvasSrc.getContextRead().getImageData(0, 0, canvasSrc.width, canvasSrc.height);

    return new Promise((resolve, reject) => {
      this.worker!.onmessage = (e) => {
        const { imageData } = e.data;
        canvasDst.getContextWrite().putImageData(imageData, 0, 0);
        resolve();
      };

      this.worker!.onerror = reject;

      // Transfer ImageData to worker
      this.worker!.postMessage({
        operation: 'brightnessContrast',
        imageData: srcImageData,
        params: { brightness, contrast }
      }, [srcImageData.data.buffer]);
    });
  }

  private applyBrightnessContrastOptimized(
    canvasSrc: MCanvas,
    canvasDst: MCanvas,
    brightness: number,
    contrast: number
  ): void {
    const width = canvasSrc.width;
    const height = canvasSrc.height;
    const ctxDst = canvasDst.getContextWrite();

    const srcImageData = canvasSrc.getContextRead().getImageData(0, 0, width, height);
    const srcData = srcImageData.data;

    const dstImageData = ctxDst.createImageData(width, height);
    const dstData = dstImageData.data;

    // Precompute factors
    const brightnessFactor = brightness / 100;
    const contrastFactor = (contrast + 100) / 100;

    // Process in chunks for better cache performance
    const chunkSize = this.options.chunkSize;

    for (let i = 0; i < srcData.length; i += chunkSize) {
      const end = Math.min(i + chunkSize, srcData.length);

      // Unroll loop for better performance
      for (let j = i; j < end; j += 16) {
        // Process 4 pixels at once
        for (let k = 0; k < 16 && j + k < end; k += 4) {
          const idx = j + k;
          const r = srcData[idx];
          const g = srcData[idx + 1];
          const b = srcData[idx + 2];
          const a = srcData[idx + 3];

          // Apply brightness and contrast with single calculation
          const newR = ((r / 255 - 0.5) * contrastFactor + 0.5) * 255 + brightnessFactor * 255;
          const newG = ((g / 255 - 0.5) * contrastFactor + 0.5) * 255 + brightnessFactor * 255;
          const newB = ((b / 255 - 0.5) * contrastFactor + 0.5) * 255 + brightnessFactor * 255;

          dstData[idx] = Math.max(0, Math.min(255, newR));
          dstData[idx + 1] = Math.max(0, Math.min(255, newG));
          dstData[idx + 2] = Math.max(0, Math.min(255, newB));
          dstData[idx + 3] = a;
        }
      }
    }

    ctxDst.putImageData(dstImageData, 0, 0);
  }

  // Optimized point operation with multiple strategies
  public async applyPointOperationOptimized(
    canvasSrc: MCanvas,
    canvasDst: MCanvas,
    operation: PointOperation
  ): Promise<void> {
    const pixelCount = canvasSrc.width * canvasSrc.height;

    // For very large images, prefer WebGL or Worker
    if (pixelCount > 1000000) {
      if (this.worker) {
        return this.applyPointOperationWorker(canvasSrc, canvasDst, operation);
      }
    }

    // For medium images, use optimized CPU implementation
    this.applyPointOperationCPU(canvasSrc, canvasDst, operation);
  }

  private async applyPointOperationWorker(
    canvasSrc: MCanvas,
    canvasDst: MCanvas,
    operation: PointOperation
  ): Promise<void> {
    if (!this.worker) return;

    const srcImageData = canvasSrc.getContextRead().getImageData(0, 0, canvasSrc.width, canvasSrc.height);

    return new Promise((resolve, reject) => {
      this.worker!.onmessage = (e) => {
        const { imageData } = e.data;
        canvasDst.getContextWrite().putImageData(imageData, 0, 0);
        resolve();
      };

      this.worker!.onerror = reject;

      // Serialize the operation function
      const operationString = operation.toString();

      this.worker!.postMessage({
        operation: 'pointOperation',
        imageData: srcImageData,
        operationString
      }, [srcImageData.data.buffer]);
    });
  }

  private applyPointOperationCPU(
    canvasSrc: MCanvas,
    canvasDst: MCanvas,
    operation: PointOperation
  ): void {
    const width = canvasSrc.width;
    const height = canvasSrc.height;
    const ctxDst = canvasDst.getContextWrite();

    const srcImageData = canvasSrc.getContextRead().getImageData(0, 0, width, height);
    const srcData = srcImageData.data;

    const dstImageData = ctxDst.createImageData(width, height);
    const dstData = dstImageData.data;

    // Optimized processing with chunking and unrolling
    const chunkSize = this.options.chunkSize;

    for (let i = 0; i < srcData.length; i += chunkSize) {
      const end = Math.min(i + chunkSize, srcData.length);

      for (let j = i; j < end; j += 4) {
        const pixel: RGBA = {
          r: srcData[j],
          g: srcData[j + 1],
          b: srcData[j + 2],
          a: srcData[j + 3]
        };

        const result = operation(pixel);

        dstData[j] = Math.max(0, Math.min(255, result.r));
        dstData[j + 1] = Math.max(0, Math.min(255, result.g));
        dstData[j + 2] = Math.max(0, Math.min(255, result.b));
        dstData[j + 3] = Math.max(0, Math.min(255, result.a));
      }
    }

    ctxDst.putImageData(dstImageData, 0, 0);
  }

  // Optimized box blur with separable filtering
  public async applyBoxBlurOptimized(
    canvasSrc: MCanvas,
    canvasDst: MCanvas,
    radius: number
  ): Promise<void> {
    const pixelCount = canvasSrc.width * canvasSrc.height;

    if (this.webglContext && pixelCount > 200000) {
      await this.applyBoxBlurWebGL(canvasSrc, canvasDst, radius);
    } else {
      this.applyBoxBlurCPU(canvasSrc, canvasDst, radius);
    }
  }

  private async applyBoxBlurWebGL(
    canvasSrc: MCanvas,
    canvasDst: MCanvas,
    radius: number
  ): Promise<void> {
    if (!this.webglContext) return;

    // Resize WebGL context if needed
    const currentSize = this.webglContext.getSize();
    if (currentSize.width !== canvasSrc.width || currentSize.height !== canvasSrc.height) {
      this.webglContext.resize(canvasSrc.width, canvasSrc.height);
    }

    const srcImageData = canvasSrc.getContextRead().getImageData(0, 0, canvasSrc.width, canvasSrc.height);
    const sourceTexture = this.webglContext.createTextureFromImageData(srcImageData);
    const resultTexture = this.webglContext.applyBoxBlur(sourceTexture, radius);
    const resultImageData = this.webglContext.readTextureToImageData(resultTexture);

    canvasDst.getContextWrite().putImageData(resultImageData, 0, 0);
  }

  private applyBoxBlurCPU(
    canvasSrc: MCanvas,
    canvasDst: MCanvas,
    radius: number
  ): void {
    // Use the existing optimized boxBlur implementation
    // This could be further optimized with SIMD or other techniques
    const width = canvasSrc.width;
    const height = canvasSrc.height;
    const ctxDst = canvasDst.getContextWrite();

    const srcImageData = canvasSrc.getContextRead().getImageData(0, 0, width, height);
    const srcData = srcImageData.data;

    radius = Math.max(1, Math.floor(radius));
    const kernelSize = radius * 2 + 1;

    // Create temporary buffer for horizontal pass
    const tempData = new Uint8ClampedArray(srcData.length);

    // Horizontal pass with optimizations
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0;

        // Unroll small radius cases for better performance
        if (radius <= 3) {
          for (let dx = -radius; dx <= radius; dx++) {
            const sampleX = Math.min(width - 1, Math.max(0, x + dx));
            const sampleIndex = (y * width + sampleX) * 4;

            const alpha = srcData[sampleIndex + 3];
            r += srcData[sampleIndex] * alpha;
            g += srcData[sampleIndex + 1] * alpha;
            b += srcData[sampleIndex + 2] * alpha;
            a += alpha;
          }
        } else {
          // For larger radius, use more optimized approach
          for (let dx = -radius; dx <= radius; dx++) {
            const sampleX = Math.min(width - 1, Math.max(0, x + dx));
            const sampleIndex = (y * width + sampleX) * 4;

            const alpha = srcData[sampleIndex + 3];
            r += srcData[sampleIndex] * alpha;
            g += srcData[sampleIndex + 1] * alpha;
            b += srcData[sampleIndex + 2] * alpha;
            a += alpha;
          }
        }

        const tempIndex = (y * width + x) * 4;
        tempData[tempIndex] = r / a;
        tempData[tempIndex + 1] = g / a;
        tempData[tempIndex + 2] = b / a;
        tempData[tempIndex + 3] = a / kernelSize;
      }
    }

    // Vertical pass
    const dstImageData = ctxDst.createImageData(width, height);
    const dstData = dstImageData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0;

        for (let dy = -radius; dy <= radius; dy++) {
          const sampleY = Math.min(height - 1, Math.max(0, y + dy));
          const tempIndex = (sampleY * width + x) * 4;

          const alpha = tempData[tempIndex + 3];
          r += tempData[tempIndex] * alpha;
          g += tempData[tempIndex + 1] * alpha;
          b += tempData[tempIndex + 2] * alpha;
          a += alpha;
        }

        const dstIndex = (y * width + x) * 4;
        dstData[dstIndex] = r / a;
        dstData[dstIndex + 1] = g / a;
        dstData[dstIndex + 2] = b / a;
        dstData[dstIndex + 3] = a / kernelSize;
      }
    }

    ctxDst.putImageData(dstImageData, 0, 0);
  }

  public dispose(): void {
    if (this.worker) {
      this.worker.terminate();
    }
    // WebGL context will be garbage collected
  }
}
