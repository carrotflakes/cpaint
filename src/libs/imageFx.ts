import { MCanvas } from "./MCanvas";

// Point operation type definitions for pixel-wise transformations
export type RGBA = {
  r: number;
  g: number;
  b: number;
  a: number;
};

export type PointOperation = (pixel: RGBA) => RGBA;

/**
 * Efficiently applies a point operation to each pixel in the image.
 * This function optimizes for performance by minimizing function call overhead.
 */
export function applyPointOperation(
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

  // Process pixels in batches for better performance
  for (let i = 0; i < srcData.length; i += 4) {
    const pixel: RGBA = {
      r: srcData[i],
      g: srcData[i + 1],
      b: srcData[i + 2],
      a: srcData[i + 3]
    };

    const result = operation(pixel);

    dstData[i] = Math.max(0, Math.min(255, result.r));
    dstData[i + 1] = Math.max(0, Math.min(255, result.g));
    dstData[i + 2] = Math.max(0, Math.min(255, result.b));
    dstData[i + 3] = Math.max(0, Math.min(255, result.a));
  }

  ctxDst.putImageData(dstImageData, 0, 0);
}

// Common color space conversion utilities for reuse
export const ColorUtils = {
  /**
   * Convert RGB to HSL color space
   */
  rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    const sum = max + min;
    const l = sum / 2;

    let h = 0;
    let s = 0;

    if (diff !== 0) {
      s = l > 0.5 ? diff / (2 - sum) : diff / sum;

      switch (max) {
        case r: h = ((g - b) / diff + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / diff + 2) / 6; break;
        case b: h = ((r - g) / diff + 4) / 6; break;
      }
    }

    return { h, s, l };
  },

  /**
   * Convert HSL to RGB color space
   */
  hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    if (s === 0) {
      const gray = Math.round(l * 255);
      return { r: gray, g: gray, b: gray };
    }

    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    return {
      r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
      g: Math.round(hue2rgb(p, q, h) * 255),
      b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255)
    };
  }
};

export function blur(
  canvasSrc: MCanvas,
  canvasDst: MCanvas,
  radius: number
) {
  const ctxDst = canvasDst.getContextWrite();
  ctxDst.filter = `blur(${radius}px)`;
  ctxDst.drawImage(canvasSrc.getCanvas(), 0, 0);
}

export function boxBlur(
  canvasSrc: MCanvas,
  canvasDst: MCanvas,
  radius: number
) {
  const width = canvasSrc.width;
  const height = canvasSrc.height;
  const ctxDst = canvasDst.getContextWrite();

  const srcImageData = (canvasSrc.getContextRead()).getImageData(0, 0, width, height);
  const srcData = srcImageData.data;

  radius = Math.max(1, Math.floor(radius));
  const kernelSize = radius * 2 + 1;

  // Create temporary buffer for horizontal pass
  const tempData = new Uint8ClampedArray(srcData.length);

  // Horizontal pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;

      // Sample pixels horizontally
      for (let dx = -radius; dx <= radius; dx++) {
        const sampleX = Math.min(width - 1, Math.max(0, x + dx));
        const sampleIndex = (y * width + sampleX) * 4;

        const alpha = srcData[sampleIndex + 3];
        r += srcData[sampleIndex] * alpha;
        g += srcData[sampleIndex + 1] * alpha;
        b += srcData[sampleIndex + 2] * alpha;
        a += alpha;
      }

      const tempIndex = (y * width + x) * 4;
      tempData[tempIndex] = r / a;
      tempData[tempIndex + 1] = g / a;
      tempData[tempIndex + 2] = b / a;
      tempData[tempIndex + 3] = a / kernelSize;
    }
  }

  // Create final output buffer
  const dstImageData = ctxDst.createImageData(width, height);
  const dstData = dstImageData.data;

  // Vertical pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;

      // Sample pixels vertically from the horizontally blurred data
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

export function pixelate(
  canvasSrc: MCanvas,
  canvasDst: MCanvas,
  pixelSize: number
) {
  const width = canvasSrc.width;
  const height = canvasSrc.height;
  const ctxDst = canvasDst.getContextWrite();

  const srcImageData = canvasSrc.getContextRead().getImageData(0, 0, width, height);
  const srcData = srcImageData.data;

  const dstImageData = ctxDst.createImageData(width, height);
  const dstData = dstImageData.data;

  pixelSize = Math.max(1, Math.floor(pixelSize));

  // Create pixelated effect by sampling pixels at regular intervals
  for (let y = 0; y < height; y += pixelSize) {
    for (let x = 0; x < width; x += pixelSize) {
      // Sample the center pixel of the block
      const sampleX = Math.min(width - 1, x + Math.floor(pixelSize / 2));
      const sampleY = Math.min(height - 1, y + Math.floor(pixelSize / 2));
      const sampleIndex = (sampleY * width + sampleX) * 4;

      const r = srcData[sampleIndex];
      const g = srcData[sampleIndex + 1];
      const b = srcData[sampleIndex + 2];
      const a = srcData[sampleIndex + 3];

      // Fill the entire block with the sampled color
      for (let dy = 0; dy < pixelSize && y + dy < height; dy++) {
        for (let dx = 0; dx < pixelSize && x + dx < width; dx++) {
          const dstIndex = ((y + dy) * width + (x + dx)) * 4;
          dstData[dstIndex] = r;
          dstData[dstIndex + 1] = g;
          dstData[dstIndex + 2] = b;
          dstData[dstIndex + 3] = a;
        }
      }
    }
  }

  ctxDst.putImageData(dstImageData, 0, 0);
}

export function brightnessContrast(
  canvasSrc: MCanvas,
  canvasDst: MCanvas,
  brightness: number,
  contrast: number
) {
  // Normalize brightness (-100 to 100) and contrast (-100 to 100)
  const brightnessFactor = brightness / 100;
  const contrastFactor = (contrast + 100) / 100;

  applyPointOperation(canvasSrc, canvasDst, (pixel) => {
    // Apply brightness and contrast
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

export function hueSaturation(
  canvasSrc: MCanvas,
  canvasDst: MCanvas,
  hue: number,
  saturation: number,
  lightness: number
) {
  // Normalize parameters
  const hueShift = (hue % 360) / 360;
  const satMultiplier = (saturation + 100) / 100;
  const lightMultiplier = (lightness + 100) / 100;

  applyPointOperation(canvasSrc, canvasDst, (pixel) => {
    // Convert RGB to HSL using utility function
    const { h, s, l } = ColorUtils.rgbToHsl(pixel.r, pixel.g, pixel.b);

    // Apply adjustments
    const newH = (h + hueShift) % 1;
    const newS = Math.max(0, Math.min(1, s * satMultiplier));
    const newL = Math.max(0, Math.min(1, l * lightMultiplier));

    // Convert HSL back to RGB using utility function
    const { r, g, b } = ColorUtils.hslToRgb(newH, newS, newL);

    return {
      r,
      g,
      b,
      a: pixel.a
    };
  });
}

export function colorBalance(
  canvasSrc: MCanvas,
  canvasDst: MCanvas,
  cyan: number,
  magenta: number,
  yellow: number
) {
  // Normalize adjustments (-100 to 100)
  const cyanRed = -cyan / 100;
  const magentaGreen = -magenta / 100;
  const yellowBlue = -yellow / 100;

  applyPointOperation(canvasSrc, canvasDst, (pixel) => {
    const { r, g, b, a } = pixel;

    // Apply color balance adjustments
    let newR = r - cyanRed * (255 - r) / 255 * 255;
    let newG = g - magentaGreen * (255 - g) / 255 * 255;
    let newB = b - yellowBlue * (255 - b) / 255 * 255;

    // Apply opposite adjustments
    if (cyanRed < 0) newR = r + Math.abs(cyanRed) * r / 255 * 255;
    if (magentaGreen < 0) newG = g + Math.abs(magentaGreen) * g / 255 * 255;
    if (yellowBlue < 0) newB = b + Math.abs(yellowBlue) * b / 255 * 255;

    return {
      r: newR,
      g: newG,
      b: newB,
      a
    };
  });
}
