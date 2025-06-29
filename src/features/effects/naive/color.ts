import { MCanvas } from "../../../libs/MCanvas";
import { applyPointOperation } from "./point-op";

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
  const cyanRed = cyan / 100;
  const magentaGreen = magenta / 100;
  const yellowBlue = yellow / 100;

  applyPointOperation(canvasSrc, canvasDst, (pixel) => {
    const { r, g, b, a } = pixel;

    return {
      r: cyanRed >= 0 ? r * (1 + cyanRed) : r + cyanRed * (255 - r),
      g: magentaGreen >= 0 ? g * (1 + magentaGreen) : g + magentaGreen * (255 - g),
      b: yellowBlue >= 0 ? b * (1 + yellowBlue) : b + yellowBlue * (255 - b),
      a
    };
  });
}
