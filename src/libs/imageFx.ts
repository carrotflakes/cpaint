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

export function boxBlur(
  canvasSrc: MCanvas,
  canvasDst: MCanvas,
  radius: number
) {
  const width = canvasSrc.width;
  const height = canvasSrc.height;
  const ctxDst = canvasDst.getContextWrite();

  const srcImageData = (canvasSrc.getContextRead()).getImageData(0, 0, width, height);
  const srcData = srcImageData.data;

  radius = Math.max(1, Math.floor(radius));
  const kernelSize = radius * 2 + 1;

  // Create temporary buffer for horizontal pass
  const tempData = new Uint8ClampedArray(srcData.length);

  // Horizontal pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;

      // Sample pixels horizontally
      for (let dx = -radius; dx <= radius; dx++) {
        const sampleX = Math.min(width - 1, Math.max(0, x + dx));
        const sampleIndex = (y * width + sampleX) * 4;

        const alpha = srcData[sampleIndex + 3];
        r += srcData[sampleIndex] * alpha;
        g += srcData[sampleIndex + 1] * alpha;
        b += srcData[sampleIndex + 2] * alpha;
        a += alpha;
      }

      const tempIndex = (y * width + x) * 4;
      tempData[tempIndex] = r / a;
      tempData[tempIndex + 1] = g / a;
      tempData[tempIndex + 2] = b / a;
      tempData[tempIndex + 3] = a / kernelSize;
    }
  }

  // Create final output buffer
  const dstImageData = ctxDst.createImageData(width, height);
  const dstData = dstImageData.data;

  // Vertical pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;

      // Sample pixels vertically from the horizontally blurred data
      for (let dy = -radius; dy <= radius; dy++) {
        const sampleY = Math.min(height - 1, Math.max(0, y + dy));
        const tempIndex = (sampleY * width + x) * 4;

        const alpha = tempData[tempIndex + 3];
        r += tempData[tempIndex] * alpha;
        g += tempData[tempIndex + 1] * alpha;
        b += tempData[tempIndex + 2] * alpha;
        a += alpha;
      }

      const dstIndex = (y * width + x) * 4;
      dstData[dstIndex] = r / a;
      dstData[dstIndex + 1] = g / a;
      dstData[dstIndex + 2] = b / a;
      dstData[dstIndex + 3] = a / kernelSize;
    }
  }

  ctxDst.putImageData(dstImageData, 0, 0);
}

export function pixelate(
  canvasSrc: MCanvas,
  canvasDst: MCanvas,
  pixelSize: number
) {
  const width = canvasSrc.width;
  const height = canvasSrc.height;
  const ctxDst = canvasDst.getContextWrite();

  const srcImageData = canvasSrc.getContextRead().getImageData(0, 0, width, height);
  const srcData = srcImageData.data;

  const dstImageData = ctxDst.createImageData(width, height);
  const dstData = dstImageData.data;

  pixelSize = Math.max(1, Math.floor(pixelSize));

  // Create pixelated effect by sampling pixels at regular intervals
  for (let y = 0; y < height; y += pixelSize) {
    for (let x = 0; x < width; x += pixelSize) {
      // Sample the center pixel of the block
      const sampleX = Math.min(width - 1, x + Math.floor(pixelSize / 2));
      const sampleY = Math.min(height - 1, y + Math.floor(pixelSize / 2));
      const sampleIndex = (sampleY * width + sampleX) * 4;

      const r = srcData[sampleIndex];
      const g = srcData[sampleIndex + 1];
      const b = srcData[sampleIndex + 2];
      const a = srcData[sampleIndex + 3];

      // Fill the entire block with the sampled color
      for (let dy = 0; dy < pixelSize && y + dy < height; dy++) {
        for (let dx = 0; dx < pixelSize && x + dx < width; dx++) {
          const dstIndex = ((y + dy) * width + (x + dx)) * 4;
          dstData[dstIndex] = r;
          dstData[dstIndex + 1] = g;
          dstData[dstIndex + 2] = b;
          dstData[dstIndex + 3] = a;
        }
      }
    }
  }

  ctxDst.putImageData(dstImageData, 0, 0);
}
