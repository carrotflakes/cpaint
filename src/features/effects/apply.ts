import { MCanvas } from "../../libs/MCanvas";
import { useGlobalSettings } from "../../store/globalSetting";
import { Effect } from "./types";
import * as imageFx from "./naive";
import { OptimizedEffects } from "./optimized";

// Global optimized effects instance - initialized lazily
let optimizedEffectsInstance: OptimizedEffects | null = null;

function getOptimizedEffects(): OptimizedEffects {
  if (!optimizedEffectsInstance) {
    const settings = useGlobalSettings.getState();
    optimizedEffectsInstance = new OptimizedEffects(settings.effectPerformance);
  }
  return optimizedEffectsInstance;
}

// Reinitialize effects when settings change
export function reinitializeEffects(): void {
  if (optimizedEffectsInstance) {
    optimizedEffectsInstance.dispose();
    optimizedEffectsInstance = null;
  }
}

export async function applyEffect(
  canvasSrc: MCanvas,
  canvasDst: MCanvas,
  effect: Effect
): Promise<void> {
  // Use optimized effects for supported operations
  const optimizedEffects = getOptimizedEffects();

  switch (effect.type) {
    case "blur":
      imageFx.blur(canvasSrc, canvasDst, effect.radius);
      break;
    case "boxBlur":
      // Use optimized version for box blur
      try {
        await optimizedEffects.applyBoxBlurOptimized(canvasSrc, canvasDst, effect.radius);
      } catch {
        // Fallback to original implementation
        imageFx.boxBlur(canvasSrc, canvasDst, effect.radius);
      }
      break;
    case "pixelate":
      imageFx.pixelate(canvasSrc, canvasDst, effect.pixelSize);
      break;
    case "brightnessContrast":
      // Use optimized version for brightness/contrast
      try {
        await optimizedEffects.applyBrightnessContrast(canvasSrc, canvasDst, effect.brightness, effect.contrast);
      } catch {
        // Fallback to original implementation
        imageFx.brightnessContrast(canvasSrc, canvasDst, effect.brightness, effect.contrast);
      }
      break;
    case "hueSaturation":
      // Use optimized point operation for HSL
      const hueShift = (effect.hue % 360) / 360;
      const satMultiplier = (effect.saturation + 100) / 100;
      const lightMultiplier = (effect.lightness + 100) / 100;

      try {
        await optimizedEffects.applyPointOperationOptimized(canvasSrc, canvasDst, (pixel) => {
          const { h, s, l } = imageFx.ColorUtils.rgbToHsl(pixel.r, pixel.g, pixel.b);
          const newH = (h + hueShift) % 1;
          const newS = Math.max(0, Math.min(1, s * satMultiplier));
          const newL = Math.max(0, Math.min(1, l * lightMultiplier));
          const { r, g, b } = imageFx.ColorUtils.hslToRgb(newH, newS, newL);
          return { r, g, b, a: pixel.a };
        });
      } catch {
        // Fallback to original implementation
        imageFx.hueSaturation(canvasSrc, canvasDst, effect.hue, effect.saturation, effect.lightness);
      }
      break;
    case "colorBalance":
      // Use optimized point operation for color balance
      const cyanRed = -effect.cyan / 100;
      const magentaGreen = -effect.magenta / 100;
      const yellowBlue = -effect.yellow / 100;

      try {
        await optimizedEffects.applyPointOperationOptimized(canvasSrc, canvasDst, (pixel) => {
          const { r, g, b, a } = pixel;
          let newR = r - cyanRed * (255 - r) / 255 * 255;
          let newG = g - magentaGreen * (255 - g) / 255 * 255;
          let newB = b - yellowBlue * (255 - b) / 255 * 255;

          if (cyanRed < 0) newR = r + Math.abs(cyanRed) * r / 255 * 255;
          if (magentaGreen < 0) newG = g + Math.abs(magentaGreen) * g / 255 * 255;
          if (yellowBlue < 0) newB = b + Math.abs(yellowBlue) * b / 255 * 255;

          return { r: newR, g: newG, b: newB, a };
        });
      } catch {
        // Fallback to original implementation
        imageFx.colorBalance(canvasSrc, canvasDst, effect.cyan, effect.magenta, effect.yellow);
      }
      break;
    default:
      throw new Error(`Unknown effect type: ${effect}`);
  }
}
