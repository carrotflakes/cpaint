import { MCanvas } from "../../../libs/MCanvas";

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
