import { CanvasContext, Touch } from ".";
import { pathToDots } from "./particle";

export function startTouchCat({ width, color, opacity, canvasSize }: { width: number; color: string; opacity: number; canvasSize: [number, number]; }
): Touch {
  const canvas = new OffscreenCanvas(canvasSize[0], canvasSize[1]);

  const path = pathToDots();
  let isRight = true;

  return {
    stroke(x: number, y: number, pressure: number) {
      path.path.push({ x, y, pressure });

      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = color;
      ctx.globalAlpha = opacity;
      while (true) {
        const d = path.current();
        if (!d) break;
        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.rotate(Math.PI * 0.5 + Math.atan2(d.dy, d.dx));
        ctx.scale(width, width);
        ctx.translate(isRight ? 0.15 : -0.15, 0);
        ctx.beginPath();
        ctx.arc(0, -0.04, 0.1, 0, Math.PI * 2);
        ctx.closePath();
        ctx.arc(-0.05, 0.0, 0.1, 0, Math.PI * 2);
        ctx.closePath();
        ctx.arc(0.05, 0.0, 0.1, 0, Math.PI * 2);
        ctx.closePath();
        ctx.arc(-0.17, -0.12, 0.045, 0, Math.PI * 2);
        ctx.closePath();
        ctx.arc(-0.07, -0.24, 0.05, 0, Math.PI * 2);
        ctx.closePath();
        ctx.arc(0.07, -0.24, 0.05, 0, Math.PI * 2);
        ctx.closePath();
        ctx.arc(0.17, -0.12, 0.045, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        path.next(width);
        isRight = !isRight;
      }
    },
    end() {
    },
    transfer(ctx: CanvasContext) {
      ctx.save();
      ctx.drawImage(canvas, 0, 0);
      ctx.restore();
    },
  };
}