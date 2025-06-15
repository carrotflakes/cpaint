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
    default:
      throw new Error(`Unknown effect type: ${effect}`);
  }
}
