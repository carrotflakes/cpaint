export type ImageDiff = Readonly<{
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
  canvas: OffscreenCanvas,
  diff: ImageDiff,
): ImageDiff {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get context");
  }
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

export function canvasToImageDiff(
  canvas1: OffscreenCanvas,
  canvas2: OffscreenCanvas,
): ImageDiff | null {
  if (canvas1.width !== canvas2.width || canvas1.height !== canvas2.height) {
    throw new Error("Canvas sizes do not match");
  }

  const ctx1 = canvas1.getContext("2d");
  const ctx2 = canvas2.getContext("2d");
  if (!ctx1 || !ctx2) {
    throw new Error("Failed to get context");
  }

  const width = canvas1.width;
  const height = canvas1.height;
  const imageData1 = ctx1.getImageData(0, 0, width, height);
  const imageData2 = ctx2.getImageData(0, 0, width, height);

  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      if (
        imageData1.data[index] !== imageData2.data[index] ||
        imageData1.data[index + 1] !== imageData2.data[index + 1] ||
        imageData1.data[index + 2] !== imageData2.data[index + 2] ||
        imageData1.data[index + 3] !== imageData2.data[index + 3]
      ) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX === -1) {
    // No differences found
    return null;
  }

  const diffWidth = maxX - minX + 1;
  const diffHeight = maxY - minY + 1;
  const diffImageData = ctx2.getImageData(minX, minY, diffWidth, diffHeight);
  return {
    rect: { x: minX, y: minY, width: diffWidth, height: diffHeight },
    image: diffImageData,
  };
}

export function canvasRect(canvas: OffscreenCanvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get context");
  }
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1;
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const index = (y * canvas.width + x) * 4;
      if (
        imageData.data[index] !== 0 ||
        imageData.data[index + 1] !== 0 ||
        imageData.data[index + 2] !== 0 ||
        imageData.data[index + 3] !== 0
      ) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX === -1) return null;
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  }
}
