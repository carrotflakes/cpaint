import { MCanvas } from "../../libs/MCanvas";
import * as imageFx from "./naive";
import { Effect } from "./types";
import { isWebGLSupported, getWebGLEffectInstance } from "./webgl";

export function applyEffect(
  canvasSrc: MCanvas,
  canvasDst: MCanvas,
  effect: Effect,
  useWebGL: boolean = true
) {
  const useWebGLForEffect = useWebGL && isWebGLSupported() && canUseWebGLForEffect(effect.type);

  if (useWebGLForEffect) {
    applyWebGLEffect(canvasSrc, canvasDst, effect);
  } else {
    applyNaiveEffect(canvasSrc, canvasDst, effect);
  }
}

function canUseWebGLForEffect(effectType: string): boolean {
  return ['blur', 'pixelate', 'brightnessContrast', 'hueSaturation', 'colorBalance'].includes(effectType);
}

function applyWebGLEffect(canvasSrc: MCanvas, canvasDst: MCanvas, effect: Effect) {
  try {
    const srcCtx = canvasSrc.getContextRead();
    const srcImageData = srcCtx.getImageData(0, 0, canvasSrc.width, canvasSrc.height);
    let resultImageData: ImageData;

    switch (effect.type) {
      case "blur": {
        const webglEffect = getWebGLEffectInstance('blur');
        resultImageData = webglEffect.apply(srcImageData, { radius: effect.radius });
        break;
      }
      case "pixelate": {
        const webglEffect = getWebGLEffectInstance('pixelate');
        resultImageData = webglEffect.apply(srcImageData, { pixelSize: effect.pixelSize });
        break;
      }
      case "brightnessContrast": {
        const webglEffect = getWebGLEffectInstance('brightnessContrast');
        resultImageData = webglEffect.apply(srcImageData, {
          brightness: effect.brightness,
          contrast: effect.contrast
        });
        break;
      }
      case "hueSaturation": {
        const webglEffect = getWebGLEffectInstance('hueSaturation');
        resultImageData = webglEffect.apply(srcImageData, {
          hue: effect.hue,
          saturation: effect.saturation,
          lightness: effect.lightness
        });
        break;
      }
      case "colorBalance": {
        const webglEffect = getWebGLEffectInstance('colorBalance');
        resultImageData = webglEffect.apply(srcImageData, {
          cyan: effect.cyan,
          magenta: effect.magenta,
          yellow: effect.yellow,
        });
        break;
      }
      default:
        throw new Error(`WebGL effect "${effect.type}" not implemented`);
    }

    const dstCtx = canvasDst.getContextWrite();
    dstCtx.putImageData(resultImageData, 0, 0);
  } catch (error) {
    console.warn(`WebGL effect failed, falling back to naive implementation:`, error);
    applyNaiveEffect(canvasSrc, canvasDst, effect);
  }
}

function applyNaiveEffect(canvasSrc: MCanvas, canvasDst: MCanvas, effect: Effect) {
  switch (effect.type) {
    case "blur":
      imageFx.blur(canvasSrc, canvasDst, effect.radius);
      break;
    case "boxBlur":
      imageFx.boxBlur(canvasSrc, canvasDst, effect.radius);
      break;
    case "pixelate":
      imageFx.pixelate(canvasSrc, canvasDst, effect.pixelSize);
      break;
    case "brightnessContrast":
      imageFx.brightnessContrast(canvasSrc, canvasDst, effect.brightness, effect.contrast);
      break;
    case "hueSaturation":
      imageFx.hueSaturation(canvasSrc, canvasDst, effect.hue, effect.saturation, effect.lightness);
      break;
    case "colorBalance":
      imageFx.colorBalance(canvasSrc, canvasDst, effect.cyan, effect.magenta, effect.yellow);
      break;
    default:
      throw new Error(`Unknown effect type: ${effect}`);
  }
}
