import { Effect } from "./types";

export * from "./apply";
export * from "./types";

export function effectName(effect: Effect) {
  switch (effect.type) {
    case "blur":
      return "Blur";
    case "boxBlur":
      return "Box Blur";
    case "pixelate":
      return "Pixelate";
    case "brightnessContrast":
      return "Brightness/Contrast";
    case "hueSaturation":
      return "Hue/Saturation";
    case "colorBalance":
      return "Color Balance";
    default:
      return "-";
  }
}
