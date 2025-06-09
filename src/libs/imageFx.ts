import { MCanvas } from "./MCanvas";

export function blur(
  canvasSrc: MCanvas,
  canvasDst: MCanvas,
  blurAmount: number
) {
  const ctxDst = canvasDst.getContextWrite();
  ctxDst.filter = `blur(${blurAmount}px)`;
  ctxDst.drawImage(canvasSrc.getCanvas(), 0, 0);
}
