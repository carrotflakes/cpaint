import { CanvasContext, Touch, updateRectCircle } from ".";

export function startTouchPixel({ color, opacity, canvasSize }:
  { color: string, opacity: number, canvasSize: [number, number] }
): Touch {
  const canvas = new OffscreenCanvas(canvasSize[0], canvasSize[1]);
  let imageData: ImageData;

  {
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
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
  } | null = null;

  return {
    stroke(x: number, y: number) {
      if (prev) {
        if (Math.abs((x - prev.x)) > Math.abs((y - prev.y))) {
          // Horizontal line
          let s = prev;
          let e = { x, y };
          if (s.x > e.x)
            [s, e] = [e, s];

          for (let x = Math.max(0, Math.round(s.x)), max = Math.min(canvasSize[0] - 1, Math.round(e.x)); x <= max; x++) {
            const y = Math.round((s.y + (e.y - s.y) * (x - s.x) / (e.x - s.x)));
            imageData.data[(y * imageData.width + x) * 4 + 3] = 255;
          }
        } else {
          // Vertical line
          let s = prev;
          let e = { x, y };
          if (s.y > e.y)
            [s, e] = [e, s];

          for (let y = Math.max(0, Math.round(s.y)), max = Math.min(canvasSize[1] - 1, Math.round(e.y)); y <= max; y++) {
            const x = Math.round((s.x + (e.x - s.x) * (y - s.y) / (e.y - s.y)));
            if (x < 0 || x >= imageData.width) continue;
            imageData.data[(y * imageData.width + x) * 4 + 3] = 255;
          }
        }
      }
      prev = { x, y };
      this.rect = updateRectCircle(this.rect, x, y, 1);
    },
    end() {
    },
    transfer(ctx: CanvasContext) {
      {
        const ctx2 = canvas.getContext("2d", { willReadFrequently: true })!;
        ctx2.putImageData(imageData, 0, 0);
      }

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.drawImage(canvas, 0, 0);
      ctx.restore();
    },
    rect: null,
  }
}
