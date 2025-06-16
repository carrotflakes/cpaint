export function createCheckCanvas(size = 20) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f0f0f0";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#ccc";
  ctx.fillRect(0, 0, size / 2, size / 2);
  ctx.fillRect(size / 2, size / 2, size / 2, size / 2);
  return canvas;
}

export const CHECK_PATTERN =
  `url(${createCheckCanvas().toDataURL()})`;
