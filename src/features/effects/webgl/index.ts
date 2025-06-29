export { EffectBase } from './EffectBase';
export { BlurEffect } from './BlurEffect';
export { BrightnessContrastEffect } from './BrightnessContrastEffect';
export { HueSaturationEffect } from './HueSaturationEffect';
export { PixelateEffect } from './PixelateEffect';
export { ColorBalanceEffect } from './ColorBalanceEffect';

import { BlurEffect } from './BlurEffect';
import { BrightnessContrastEffect } from './BrightnessContrastEffect';
import { HueSaturationEffect } from './HueSaturationEffect';
import { PixelateEffect } from './PixelateEffect';
import { ColorBalanceEffect } from './ColorBalanceEffect';

export interface WebGLEffectConstructor {
  new(canvas: HTMLCanvasElement): {
    apply(imageData: ImageData, params?: any): ImageData;
    cleanup(): void;
  };
}

export const webglEffects: Record<string, WebGLEffectConstructor> = {
  blur: BlurEffect,
  brightnessContrast: BrightnessContrastEffect,
  hueSaturation: HueSaturationEffect,
  pixelate: PixelateEffect,
  colorBalance: ColorBalanceEffect,
};

let webglCanvas: HTMLCanvasElement | null = null;
let effectInstances: Record<string, any> = {};

export function getWebGLCanvas(): HTMLCanvasElement {
  if (!webglCanvas) {
    webglCanvas = document.createElement('canvas');
    webglCanvas.width = 1;
    webglCanvas.height = 1;
  }
  return webglCanvas;
}

export function getWebGLEffectInstance(effectName: string): any {
  if (!effectInstances[effectName]) {
    const EffectClass = webglEffects[effectName];
    if (!EffectClass) {
      throw new Error(`WebGL effect "${effectName}" not found`);
    }
    effectInstances[effectName] = new EffectClass(getWebGLCanvas());
  }
  return effectInstances[effectName];
}

export function cleanupWebGLEffects(): void {
  Object.values(effectInstances).forEach(instance => {
    if (instance && typeof instance.cleanup === 'function') {
      instance.cleanup();
    }
  });
  effectInstances = {};
  webglCanvas = null;
}

export function isWebGLSupported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    return gl !== null;
  } catch (error) {
    return false;
  }
}