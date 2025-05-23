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
    const [x, y] = queue.pop()!;

    if (imageDataDst.data[(y * canvasWidth + x) * 4 + 3] !== 0)
      continue;

    let lx = x;
    while (lx >= 0 && match(getColorAtPixel(imageDataSrc, lx, y)))
      lx--;

    let rx = x;
    while (rx < canvasWidth && match(getColorAtPixel(imageDataSrc, rx, y)))
      rx++;

    for (let px = lx + 1; px < rx; px++)
      setColorAtPixel(imageDataDst, px, y, fillColor);

    if (y > 0)
      for (let px = lx + 1; px < rx; px++)
        queue.push([px, y - 1]);

    if (y < canvasHeight - 1)
      for (let px = lx + 1; px < rx; px++)
        queue.push([px, y + 1]);
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
