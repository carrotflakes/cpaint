export type CanvasContext = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

export type Touch = {
  stroke: (x: number, y: number, pressure: number) => void;
  end: () => void;
  transfer: (ctx: CanvasContext) => void;
}

export function startTouchBrush({ brushType, width, color, opacity, erace, canvasSize }:
  { brushType: string, width: number, color: string, opacity: number, erace: boolean, canvasSize: [number, number] }
): Touch {
  switch (brushType) {
    case "soft":
      return startTouchSoft({ width, color, opacity, erace, canvasSize });
    case "hard":
    default:
      return startTouchHard({ width, color, opacity, erace, canvasSize });
  }
}

export function startTouchSoft({ width, color, opacity, erace, canvasSize }:
  { width: number, color: string, opacity: number, erace: boolean, canvasSize: [number, number] }
): Touch {
  const canvas = new OffscreenCanvas(canvasSize[0], canvasSize[1]);
  let imageData: ImageData;

  {
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvasSize[0], canvasSize[1]);
    imageData = ctx.getImageData(0, 0, canvasSize[0], canvasSize[1]);
    // set to transparent
    for (let i = 3; i < imageData.data.length; i += 4)
      imageData.data[i] = 0;
  }

  let prev: {
    x: number,
    y: number,
    pressure: number,
  } | null = null;

  return {
    stroke(x: number, y: number, pressure: number) {
      if (prev) {
        drawSoftLine(
          imageData,
          prev.x,
          prev.y,
          x,
          y,
          width * prev.pressure,
          width * pressure,
          (d) => Math.tanh((d - 0.5) * 5.0) * 0.5 + 0.5,
        );
      }
      prev = { x, y, pressure };
    },
    end() {
    },
    transfer(ctx: CanvasContext) {
      {
        const ctx2 = canvas.getContext("2d")!;
        ctx2.putImageData(imageData, 0, 0);
      }

      ctx.save();
      if (erace)
        ctx.globalCompositeOperation = "destination-out";
      ctx.globalAlpha = opacity;
      ctx.drawImage(canvas, 0, 0);
      ctx.restore();
    },
  }
}

export function startTouchHard({ width, color, opacity, erace, canvasSize }:
  { width: number, color: string, opacity: number, erace: boolean, canvasSize: [number, number] }
): Touch {
  const canvas = new OffscreenCanvas(canvasSize[0], canvasSize[1]);

  const path: { x: number, y: number, pressure: number }[] = [];

  return {
    stroke(x: number, y: number, pressure: number) {
      path.push({ x, y, pressure });
    },
    end() {
    },
    transfer(ctx: CanvasContext) {
      {
        const ctx2 = canvas.getContext("2d")!;
        ctx2.clearRect(0, 0, canvasSize[0], canvasSize[1]);
        ctx2.strokeStyle = color;
        ctx2.lineWidth = width;
        ctx2.lineCap = "round";
        ctx2.lineJoin = "round";
        ctx2.beginPath();
        for (const p of path) {
          ctx2.lineTo(p.x, p.y);
        }
        ctx2.stroke();
      }

      ctx.save();
      if (erace)
        ctx.globalCompositeOperation = "destination-out";
      ctx.globalAlpha = opacity;
      ctx.drawImage(canvas, 0, 0);
      ctx.restore();
    },
  }
}

export function startTouchFill({ color, opacity, erace }:
  { color: string, opacity: number, erace: boolean }
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
        if (erace)
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

export function drawSoftLine(imageData: ImageData, x0: number, y0: number, x1: number, y1: number, size0: number, size1: number, f: (v: number) => number) {
  const maxSize = Math.max(size0, size1);
  const left = Math.floor(Math.min(x0, x1) - maxSize);
  const top = Math.floor(Math.min(y0, y1) - maxSize);
  const right = Math.ceil(Math.max(x0, x1) + maxSize);
  const bottom = Math.ceil(Math.max(y0, y1) + maxSize);

  for (let y = Math.max(0, top); y < Math.min(imageData.height, bottom); y++) {
    for (let x = Math.max(0, left); x < Math.min(imageData.width, right); x++) {
      const { d2, t } = distanceWithSeg(x, y, x0, y0, x1, y1);
      const size = size0 + (size1 - size0) * t;
      const d = Math.max(0, Math.min(1, 1 - Math.sqrt(d2) / size));
      const alpha = f(d);
      const i = (y * imageData.width + x) * 4;
      imageData.data[i + 3] = Math.max(imageData.data[i + 3], Math.round(alpha * 255));
      // imageData.data[i + 3] = imageData.data[i + 3]+ Math.round(alpha * 255);
    }
  }
}

function distanceWithSeg(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number) {
  const a = x2 - x1;
  const b = y2 - y1;
  const a2 = a * a;
  const b2 = b * b;
  const r2 = a2 + b2;
  const tt = -(a * (x1 - x0) + b * (y1 - y0));
  if (tt < 0)
    return { d2: (x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0), t: 0 };
  if (tt > r2)
    return { d2: (x2 - x0) * (x2 - x0) + (y2 - y0) * (y2 - y0), t: 1 };
  const f1 = a * (y1 - y0) - b * (x1 - x0);
  return { d2: (f1 * f1) / r2, t: tt / r2 };
}
