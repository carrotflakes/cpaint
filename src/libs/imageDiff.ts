import { MCanvas } from "./MCanvas";

export type ImageDiff = Readonly<{
  // The rectangle that was changed, or null if the whole canvas was changed
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  image: ImageData;
}>;

// This function applies the image diff to the canvas and returns the previous image data
export function applyImageDiff(
  canvas: MCanvas,
  diff: ImageDiff,
): ImageDiff {
  const ctx = canvas.getContextWrite();
  if (diff.rect) {
    const imageData = ctx.getImageData(
      diff.rect.x,
      diff.rect.y,
      diff.rect.width,
      diff.rect.height,
    );
    ctx.putImageData(diff.image, diff.rect.x, diff.rect.y);
    return {
      rect: diff.rect,
      image: imageData,
    }
  } else {
    const imageData = ctx.getImageData(
      0,
      0,
      canvas.width,
      canvas.height,
    );
    ctx.putImageData(diff.image, 0, 0);
    return {
      rect: null,
      image: imageData,
    }
  }
}

// Bounding box of differing pixels between two equally-sized pixel buffers,
// relative to the buffer's top-left. Returns null when they are identical.
// Exported for testing.
export function diffBounds(
  data1: Uint32Array,
  data2: Uint32Array,
  width: number,
  height: number,
): { x: number; y: number; width: number; height: number } | null {
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data1[y * width + x] !== data2[y * width + x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX === -1) return null;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

export function canvasToImageDiff(
  canvas1: MCanvas,
  canvas2: MCanvas,
  clip?: { x: number; y: number; width: number; height: number },
): ImageDiff | null {
  if (canvas1.width !== canvas2.width || canvas1.height !== canvas2.height) {
    throw new Error("Canvas sizes do not match");
  }

  clip ??= {
    x: 0,
    y: 0,
    width: canvas1.width,
    height: canvas1.height,
  };

  const ctx1 = canvas1.getContextRead();
  const ctx2 = canvas2.getContextRead();

  const imageData1 = ctx1.getImageData(clip.x, clip.y, clip.width, clip.height);
  const imageData2 = ctx2.getImageData(clip.x, clip.y, clip.width, clip.height);
  const data1 = new Uint32Array(imageData1.data.buffer);
  const data2 = new Uint32Array(imageData2.data.buffer);

  // Bounds come back relative to the scanned (clip) region; shift to absolute.
  const bounds = diffBounds(data1, data2, clip.width, clip.height);
  if (!bounds) return null;

  const x = bounds.x + clip.x;
  const y = bounds.y + clip.y;
  const diffImageData = ctx2.getImageData(x, y, bounds.width, bounds.height);
  return {
    rect: { x, y, width: bounds.width, height: bounds.height },
    image: diffImageData,
  };
}
