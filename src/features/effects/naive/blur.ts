import { MCanvas } from "../../../libs/MCanvas";

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
