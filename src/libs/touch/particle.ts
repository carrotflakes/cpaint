import { Touch, CanvasContext, updateRectCircle } from ".";
import { mulberry32 } from "../rand";

export function startTouchParticle1({ width, color, opacity, canvasSize }: { width: number; color: string; opacity: number; canvasSize: [number, number]; }
): Touch {
  const canvas = new OffscreenCanvas(canvasSize[0], canvasSize[1]);

  const path = pathToDots();

  return {
    stroke(x: number, y: number, pressure: number) {
      path.path.push({ x, y, pressure });

      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      ctx.fillStyle = color;
      ctx.beginPath();
      while (true) {
        const d = path.current();
        if (!d) break;
        ctx.arc(d.x, d.y, width * d.pressure, 0, Math.PI * 2);
        path.next(1);
      }
      ctx.fill();
      this.rect = updateRectCircle(this.rect, x, y, width * pressure);
    },
    end() {
    },
    transfer(ctx: CanvasContext) {
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.drawImage(canvas, 0, 0);
      ctx.restore();
    },
    rect: null,
  };
}

export function startTouchParticle2({ width, color, opacity, canvasSize }: { width: number; color: string; opacity: number; canvasSize: [number, number]; }
): Touch {
  const canvas = new OffscreenCanvas(canvasSize[0], canvasSize[1]);

  const path = pathToDots();
  const rng = mulberry32(1);

  return {
    stroke(x: number, y: number, pressure: number) {
      path.path.push({ x, y, pressure });

      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      ctx.fillStyle = color;
      ctx.globalAlpha = opacity;
      while (true) {
        const d = path.current();
        if (!d) break;
        const a = rng() * Math.PI * 2;
        const r = Math.sqrt(rng()) * d.pressure;
        ctx.beginPath();
        ctx.arc(d.x + Math.cos(a) * r * width * 0.5, d.y + Math.sin(a) * r * width * 0.5, width * 0.1, 0, Math.PI * 2);
        ctx.fill();
        path.next(0.5);
      }
      this.rect = updateRectCircle(this.rect, x, y, pressure * width * 0.5 + width * 0.1);
    },
    end() {
    },
    transfer(ctx: CanvasContext) {
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.drawImage(canvas, 0, 0);
      ctx.restore();
    },
    rect: null,
  };
}

export function startTouchParticle3({ width, color, opacity, canvasSize, pressureToSize }: { width: number; color: string; opacity: number; canvasSize: [number, number]; pressureToSize: boolean; }
): Touch {
  const canvas = new OffscreenCanvas(canvasSize[0], canvasSize[1]);

  const path = pathToDots();

  return {
    stroke(x: number, y: number, pressure: number) {
      path.path.push({ x, y, pressure });

      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      ctx.fillStyle = color;
      while (true) {
        const d = path.current();
        if (!d) break;
        ctx.globalAlpha = opacity * d.pressure;
        ctx.beginPath();
        ctx.arc(d.x, d.y, width * (pressureToSize ? d.pressure : 1), 0, Math.PI * 2);
        ctx.fill();
        path.next(1);
      }
      this.rect = updateRectCircle(this.rect, x, y, width * (pressureToSize ? pressure : 1));
    },
    end() {
    },
    transfer(ctx: CanvasContext) {
      ctx.save();
      ctx.drawImage(canvas, 0, 0);
      ctx.restore();
    },
    rect: null,
  };
}

export function pathToDots() {
  return {
    path: [] as { x: number, y: number, pressure: number }[],
    i: 0,
    distance: 1,
    progress: 1,
    current() {
      while (this.progress >= this.distance) {
        if (this.path.length <= this.i + 1) return null;
        this.i++;
        this.progress -= this.distance;
        this.distance = Math.sqrt(
          (this.path[this.i].x - this.path[this.i - 1].x) ** 2 +
          (this.path[this.i].y - this.path[this.i - 1].y) ** 2);
      }

      const prev = this.path[this.i - 1];
      const next = this.path[this.i];
      if (!next) return null;

      const t = this.progress / this.distance;
      return {
        x: prev.x + (next.x - prev.x) * t,
        y: prev.y + (next.y - prev.y) * t,
        dx: next.x - prev.x,
        dy: next.y - prev.y,
        pressure: prev.pressure + (next.pressure - prev.pressure) * t,
      }
    },
    next(step: number) {
      this.progress += step;
    },
  }
}
