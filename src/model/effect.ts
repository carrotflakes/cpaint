import * as imageFx from "../libs/imageFx";
import { MCanvas } from "../libs/MCanvas";

export type Effect =
  | {
    type: "blur";
    radius: number;
  }
  | {
    type: "naiveBlur";
    radius: number;
  }
  | {
    type: "pixelate";
    pixelSize: number;
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
    case "naiveBlur":
      imageFx.naiveBlur(canvasSrc, canvasDst, effect.radius);
      break;
    case "pixelate":
      imageFx.pixelate(canvasSrc, canvasDst, effect.pixelSize);
      break;
    default:
      throw new Error(`Unknown effect type: ${effect}`);
  }
}
