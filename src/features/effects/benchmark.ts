// Example usage and benchmarking for optimized effects
// src/libs/effects/benchmark.ts

import { applyPointOperation } from "./naive";
import { OptimizedEffects } from "./optimized";
import { MCanvas } from "../../libs/MCanvas";

export class EffectBenchmark {
  private optimizedEffects: OptimizedEffects;

  constructor() {
    this.optimizedEffects = new OptimizedEffects({
      preferWebGL: true,
      useWorker: true,
      chunkSize: 65536
    });
  }

  public async benchmarkBrightnessContrast(
    canvasSrc: MCanvas,
    brightness: number = 20,
    contrast: number = 10
  ): Promise<{
    original: number;
    optimized: number;
    speedup: number
  }> {
    const canvasDst1 = new MCanvas(canvasSrc.width, canvasSrc.height);
    const canvasDst2 = new MCanvas(canvasSrc.width, canvasSrc.height);

    // Benchmark original implementation
    const startOriginal = performance.now();
    this.applyBrightnessContrastOriginal(canvasSrc, canvasDst1, brightness, contrast);
    const endOriginal = performance.now();
    const originalTime = endOriginal - startOriginal;

    // Benchmark optimized implementation
    const startOptimized = performance.now();
    await this.optimizedEffects.applyBrightnessContrast(canvasSrc, canvasDst2, brightness, contrast);
    const endOptimized = performance.now();
    const optimizedTime = endOptimized - startOptimized;

    return {
      original: originalTime,
      optimized: optimizedTime,
      speedup: originalTime / optimizedTime
    };
  }

  private applyBrightnessContrastOriginal(
    canvasSrc: MCanvas,
    canvasDst: MCanvas,
    brightness: number,
    contrast: number
  ): void {
    const brightnessFactor = brightness / 100;
    const contrastFactor = (contrast + 100) / 100;

    applyPointOperation(canvasSrc, canvasDst, (pixel) => {
      const newR = ((pixel.r / 255 - 0.5) * contrastFactor + 0.5) * 255 + brightnessFactor * 255;
      const newG = ((pixel.g / 255 - 0.5) * contrastFactor + 0.5) * 255 + brightnessFactor * 255;
      const newB = ((pixel.b / 255 - 0.5) * contrastFactor + 0.5) * 255 + brightnessFactor * 255;

      return {
        r: newR,
        g: newG,
        b: newB,
        a: pixel.a
      };
    });
  }

  public async runComprehensiveBenchmark(
    canvasSrc: MCanvas
  ): Promise<{
    brightnessContrast: { original: number; optimized: number; speedup: number };
    imageSize: { width: number; height: number; pixels: number };
    systemInfo: {
      webGLSupported: boolean;
      workerSupported: boolean;
      devicePixelRatio: number;
    };
  }> {
    const brightnessContrastResults = await this.benchmarkBrightnessContrast(canvasSrc);

    return {
      brightnessContrast: brightnessContrastResults,
      imageSize: {
        width: canvasSrc.width,
        height: canvasSrc.height,
        pixels: canvasSrc.width * canvasSrc.height
      },
      systemInfo: {
        webGLSupported: this.supportsWebGL(),
        workerSupported: typeof Worker !== 'undefined',
        devicePixelRatio: globalThis.devicePixelRatio || 1
      }
    };
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

  public dispose(): void {
    this.optimizedEffects.dispose();
  }
}
