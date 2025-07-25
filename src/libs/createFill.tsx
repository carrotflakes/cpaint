export function createFill(
  path: [number, number][],
  color: string,
  opacity: number,
  erase: boolean
) {
  return (
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
  ) => {
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = opacity;
    if (erase) ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    for (const p of path) ctx.lineTo(p[0], p[1]);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
}
