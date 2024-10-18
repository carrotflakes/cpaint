
export class TmpCanvas {
  canvas = document.createElement("canvas");
  imageData = null as null | ImageData;
  style = "#000";
  soft = false;

  constructor() { }

  begin(args: {
    size: [number, number];
    style: string;
    soft: boolean;
  }) {
    this.canvas.width = args.size[0];
    this.canvas.height = args.size[1];
    this.style = args.style;
    this.soft = args.soft;
    const ctx = this.canvas.getContext("2d")!;
    ctx.fillStyle = this.style;
    ctx.fillRect(0, 0, args.size[0], args.size[1]);
    this.imageData = ctx.getImageData(0, 0, args.size[0], args.size[1]);
    ctx.clearRect(0, 0, args.size[0], args.size[1]);
    // set to transparent
    for (let i = 3; i < this.imageData.data.length; i += 4)
      this.imageData.data[i] = 0;
  }

  addLine(args: { line: [number, number, number, number]; lineWidth: number }) {
    if (!this.imageData) return;

    const { line, lineWidth } = args;
    const ctx = this.canvas.getContext("2d")!;

    if (this.soft) {
      drawSoftLine(
        this.imageData,
        line[0],
        line[1],
        line[2],
        line[3],
        lineWidth,
        (d) => Math.tanh((d - 0.5) * 5.0) * 0.5 + 0.5,
      );
      ctx.putImageData(this.imageData, 0, 0);
    } else {
      ctx.lineCap = "round";
      ctx.strokeStyle = this.style;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(line[0], line[1]);
      ctx.lineTo(line[2], line[3]);
      ctx.stroke();
    }
  }

  fill(path: { pos: [number, number] }[]) {
    const ctx = this.canvas.getContext("2d")!;
    ctx.fillStyle = this.style;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.beginPath();
    for (const pi of path)
      ctx.lineTo(pi.pos[0], pi.pos[1]);
    ctx.fill();
  }

  finish() {
    const ctx = this.canvas.getContext("2d")!;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  isDirty() {
    const imageData = this.canvas
      .getContext("2d", { willReadFrequently: true })!
      .getImageData(0, 0, this.canvas.width, this.canvas.height);

    for (let i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] > 0) return true;
    }
    return false;
  }
}


export function drawSoftLine(imageData: ImageData, x0: number, y0: number, x1: number, y1: number, size: number, f: (v: number) => number) {
  const left = Math.floor(Math.min(x0, x1) - size);
  const top = Math.floor(Math.min(y0, y1) - size);
  const right = Math.ceil(Math.max(x0, x1) + size);
  const bottom = Math.ceil(Math.max(y0, y1) + size);

  for (let y = Math.max(0, top); y < Math.min(imageData.height, bottom); y++) {
    for (let x = Math.max(0, left); x < Math.min(imageData.width, right); x++) {
      const { d2 } = distanceWithSeg(x, y, x0, y0, x1, y1);
      const d = Math.max(0, Math.min(1, 1 - Math.sqrt(d2) / size));
      const alpha = f(d);
      const i = (y * imageData.width + x) * 4;
      imageData.data[i + 3] = Math.max(imageData.data[i + 3], Math.round(alpha * 255));
    }
  }
}

// function drawSoftLine(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, size: number) {
//   const left = Math.min(x0, x1) - size;
//   const top = Math.min(y0, y1) - size;
//   const right = Math.max(x0, x1) + size;
//   const bottom = Math.max(y0, y1) + size;

//   const canvas = document.createElement("canvas");
//   canvas.width = right - left;
//   canvas.height = bottom - top;
//   const ctx2 = canvas.getContext("2d")!;
//   ctx2.fillStyle = ctx.strokeStyle;
//   ctx2.fillRect(0, 0, canvas.width, canvas.height);
//   const imageData = ctx2.getImageData(0, 0, canvas.width, canvas.height);

//   for (let y = 0; y < imageData.height; y++) {
//     for (let x = 0; x < imageData.width; x++) {
//       const { d2 } = distanceWithSeg(x + left, y + top, x0, y0, x1, y1);
//       const alpha = Math.max(0, Math.min(1, 1 - Math.sqrt(d2) / size));
//       const i = (y * canvas.width + x) * 4;
//       imageData.data[i + 3] = Math.round(alpha * 255);
//     }
//   }
//   ctx2.putImageData(imageData, 0, 0);

//   // ctx.putImageData(imageData, left, top);
//   ctx.drawImage(canvas, left, top);
// }

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
