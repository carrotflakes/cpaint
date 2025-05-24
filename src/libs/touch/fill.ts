import { CanvasContext, Touch } from ".";

export function startTouchFill({ color, opacity, erase }:
  { color: string, opacity: number, erase: boolean }
): Touch {
  const path: { x: number, y: number }[] = [];
  let finished = false;

  return {
    stroke(x: number, y: number, _pressure: number) {
      path.push({ x, y });
    },
    end() {
      finished = true;
    },
    transfer(ctx: CanvasContext) {
      ctx.save();

      if (finished) {
        ctx.fillStyle = color;
        ctx.globalAlpha = opacity;
        if (erase)
          ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        for (let i = 0; i < path.length; i++) {
          const p = path[i];
          ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.strokeStyle = "#f00";
        ctx.beginPath();
        for (let i = 0; i < path.length; i++) {
          const p = path[i];
          ctx.lineTo(p.x, p.y);
        }
        ctx.lineWidth = 1;
        ctx.lineCap = "round";
        ctx.stroke();
      }

      ctx.restore();
    },
  }
}