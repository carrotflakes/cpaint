import { MCanvas } from "./MCanvas";

export function blur(
  canvasSrc: MCanvas,
  canvasDst: MCanvas,
  radius: number
) {
  const ctxDst = canvasDst.getContextWrite();
  ctxDst.filter = `blur(${radius}px)`;
  ctxDst.drawImage(canvasSrc.getCanvas(), 0, 0);
}

export function naiveBlur(
  canvasSrc: MCanvas,
  canvasDst: MCanvas,
  radius: number
) {
  const width = canvasSrc.width;
  const height = canvasSrc.height;
  const ctxDst = canvasDst.getContextWrite();

  const srcImageData = (canvasSrc.getContextRead()).getImageData(0, 0, width, height);
  const srcData = srcImageData.data;

  const dstImageData = ctxDst.createImageData(width, height);
  const dstData = dstImageData.data;

  radius = Math.max(1, Math.floor(radius));

  // Apply box blur (approximation of Gaussian blur)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      let count = 0;

      // Sample pixels in a square around the current pixel
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const sampleX = Math.min(width - 1, Math.max(0, x + dx));
          const sampleY = Math.min(height - 1, Math.max(0, y + dy));
          const sampleIndex = (sampleY * width + sampleX) * 4;

          r += srcData[sampleIndex];
          g += srcData[sampleIndex + 1];
          b += srcData[sampleIndex + 2];
          a += srcData[sampleIndex + 3];
          count++;
        }
      }

      const dstIndex = (y * width + x) * 4;
      dstData[dstIndex] = r / count;
      dstData[dstIndex + 1] = g / count;
      dstData[dstIndex + 2] = b / count;
      dstData[dstIndex + 3] = a / count;
    }
  }

  ctxDst.putImageData(dstImageData, 0, 0);
}
