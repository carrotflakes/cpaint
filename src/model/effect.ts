import * as imageFx from "../libs/imageFx";
import { MCanvas } from "../libs/MCanvas";

export type Effect =
  | {
    type: "blur";
    radius: number;
  }
  | {
    type: "boxBlur";
    radius: number;
  }
  | {
    type: "pixelate";
    pixelSize: number;
  }
  | {
    type: "brightnessContrast";
    brightness: number;
    contrast: number;
  }
  | {
    type: "hueSaturation";
    hue: number;
    saturation: number;
    lightness: number;
  }
  | {
    type: "colorBalance";
    cyan: number;
    magenta: number;
    yellow: number;
  }

export function applyEffect(
  canvasSrc: MCanvas,
  canvasDst: MCanvas,
  effect: Effect
) {
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
