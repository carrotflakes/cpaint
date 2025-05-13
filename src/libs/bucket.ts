type RGBAColor = {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
  a: number; // 0-255
}

export function bucketFill(
  imageDataSrc: ImageData,
  imageDataDst: ImageData,
  startX: number,
  startY: number,
  fillColor: RGBAColor,
  tolerance: number = 0,
): void {
  const canvasWidth = imageDataSrc.width;
  const canvasHeight = imageDataSrc.height;

  const sX = Math.floor(startX);
  const sY = Math.floor(startY);

  if (sX < 0 || sX >= canvasWidth || sY < 0 || sY >= canvasHeight) {
    return; // Start point is outside canvas bounds
  }

  const targetColor = getColorAtPixel(imageDataSrc, sX, sY);

  if (colorsMatch(targetColor, fillColor)) {
    return; // Target color is same as fill color, no action needed
  }

  const match = tolerance > 0
    ? (color: RGBAColor) => colorsDistance(color, targetColor) <= tolerance
    : (color: RGBAColor) => colorsMatch(color, targetColor);

  const queue: [number, number][] = [[sX, sY]];

  while (queue.length > 0) {
    const [x, y] = queue.shift()!; // Safe due to queue.length > 0 check

    if (x < 0 || x >= canvasWidth || y < 0 || y >= canvasHeight) {
      continue; // Pixel is outside canvas bounds
    }
    if (imageDataDst.data[(y * canvasWidth + x) * 4 + 3] !== 0) {
      continue; // Pixel is already filled
    }

    const currentColor = getColorAtPixel(imageDataSrc, x, y);

    if (match(currentColor)) {
      setColorAtPixel(imageDataDst, x, y, fillColor);

      // Add neighbors to the queue
      queue.push([x + 1, y]); // Right
      queue.push([x - 1, y]); // Left
      queue.push([x, y + 1]); // Down
      queue.push([x, y - 1]); // Up
    }
  }
}

export function bucketFillEstimate(
  imageDataSrc: ImageData,
  imageDataDst: ImageData,
  startX: number,
  startY: number,
  fillColor: RGBAColor,
  tolerance: number = 0,
): void {
  const canvasWidth = imageDataSrc.width;
  const canvasHeight = imageDataSrc.height;

  const sX = Math.floor(startX);
  const sY = Math.floor(startY);

  if (sX < 0 || sX >= canvasWidth || sY < 0 || sY >= canvasHeight) {
    return; // Start point is outside canvas bounds
  }

  const targetColor = getColorAtPixel(imageDataSrc, sX, sY);

  if (colorsMatch(targetColor, fillColor)) {
    return; // Target color is same as fill color, no action needed
  }

  const match = tolerance > 0
    ? (color: RGBAColor) => colorsDistance(color, targetColor) <= tolerance
    : (color: RGBAColor) => colorsMatch(color, targetColor);

  // Up
  for (let y = sY - 1; y >= 0; y--) {
    const currentColor = getColorAtPixel(imageDataSrc, sX, y);
    if (match(currentColor))
      setColorAtPixel(imageDataDst, sX, y, fillColor);
    else break;
  }
  // Down
  for (let y = sY + 1; y < canvasHeight; y++) {
    const currentColor = getColorAtPixel(imageDataSrc, sX, y);
    if (match(currentColor))
      setColorAtPixel(imageDataDst, sX, y, fillColor);
    else break;
  }
  // Left
  for (let x = sX - 1; x >= 0; x--) {
    const currentColor = getColorAtPixel(imageDataSrc, x, sY);
    if (match(currentColor))
      setColorAtPixel(imageDataDst, x, sY, fillColor);
    else break;
  }
  // Right
  for (let x = sX + 1; x < canvasWidth; x++) {
    const currentColor = getColorAtPixel(imageDataSrc, x, sY);
    if (match(currentColor))
      setColorAtPixel(imageDataDst, x, sY, fillColor);
    else break;
  }
}

function getColorAtPixel(imageData: ImageData, x: number, y: number): RGBAColor {
  const { width, data } = imageData;
  const index = (y * width + x) * 4;
  return {
    r: data[index],
    g: data[index + 1],
    b: data[index + 2],
    a: data[index + 3],
  };
}

function setColorAtPixel(imageData: ImageData, x: number, y: number, color: RGBAColor): void {
  const { width, data } = imageData;
  const index = (y * width + x) * 4;
  data[index] = color.r;
  data[index + 1] = color.g;
  data[index + 2] = color.b;
  data[index + 3] = color.a;
}

function colorsMatch(color1: RGBAColor, color2: RGBAColor): boolean {
  return (color1.a === 0 && color2.a === 0) || (
    color1.r === color2.r &&
    color1.g === color2.g &&
    color1.b === color2.b &&
    color1.a === color2.a
  );
}

function colorsDistance(color1: RGBAColor, color2: RGBAColor): number {
  return Math.sqrt(
    (((color1.r - color2.r) / 255) ** 2 +
    ((color1.g - color2.g) / 255) ** 2 +
    ((color1.b - color2.b) / 255) ** 2) / 3
  ) * (color1.a + color2.a) / (2 * 255);
}
