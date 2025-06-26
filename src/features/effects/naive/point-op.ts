import { MCanvas } from "../../../libs/MCanvas";

// Point operation type definitions for pixel-wise transformations
export type RGBA = {
  r: number;
  g: number;
  b: number;
  a: number;
};

export type PointOperation = (pixel: RGBA) => RGBA;

/**
 * Efficiently applies a point operation to each pixel in the image.
 * This function optimizes for performance by minimizing function call overhead.
 */
export function applyPointOperation(
  canvasSrc: MCanvas,
  canvasDst: MCanvas,
  operation: PointOperation
): void {
  const width = canvasSrc.width;
  const height = canvasSrc.height;
  const ctxDst = canvasDst.getContextWrite();

  const srcImageData = canvasSrc.getContextRead().getImageData(0, 0, width, height);
  const srcData = srcImageData.data;

  const dstImageData = ctxDst.createImageData(width, height);
  const dstData = dstImageData.data;

  // Process pixels in batches for better performance
  for (let i = 0; i < srcData.length; i += 4) {
    const pixel: RGBA = {
      r: srcData[i],
      g: srcData[i + 1],
      b: srcData[i + 2],
      a: srcData[i + 3]
    };

    const result = operation(pixel);

    dstData[i] = Math.max(0, Math.min(255, result.r));
    dstData[i + 1] = Math.max(0, Math.min(255, result.g));
    dstData[i + 2] = Math.max(0, Math.min(255, result.b));
    dstData[i + 3] = Math.max(0, Math.min(255, result.a));
  }

  ctxDst.putImageData(dstImageData, 0, 0);
}
