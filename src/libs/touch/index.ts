export type CanvasContext = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

export type Touch = {
  stroke: (x: number, y: number, pressure: number) => void;
  end: () => void;
  transfer: (ctx: CanvasContext) => void;
  // The rectangle that contains the touch area.
  // NOTE: this might have decimal values.
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
}

export function updateRectCircle(
  rect: { x: number; y: number; width: number; height: number } | null,
  x: number,
  y: number,
  radius: number,
): { x: number; y: number; width: number; height: number } | null {
  if (radius < 0) return rect;

  if (!rect)
    return { x: x - radius, y: y - radius, width: radius * 2, height: radius * 2 };

  const newX = Math.min(rect.x, x - radius);
  const newY = Math.min(rect.y, y - radius);
  const newWidth = Math.max(rect.x + rect.width, x + radius) - newX;
  const newHeight = Math.max(rect.y + rect.height, y + radius) - newY;
  return { x: newX, y: newY, width: newWidth, height: newHeight };
}
