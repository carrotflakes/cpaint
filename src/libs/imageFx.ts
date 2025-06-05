export function blur(
  canvasSrc: HTMLCanvasElement | OffscreenCanvas,
  canvasDst: OffscreenCanvas,
  blurAmount: number
) {
  const ctxSrc = canvasSrc.getContext("2d", { willReadFrequently: true });
  if (!ctxSrc) return;
  const ctxDst = canvasDst.getContext("2d", { willReadFrequently: true });
  if (!ctxDst) return;
  ctxDst.filter = `blur(${blurAmount}px)`;
  ctxDst.drawImage(canvasSrc, 0, 0);
}
