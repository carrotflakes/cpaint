export type CanvasContext = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

export type Touch = {
  stroke: (x: number, y: number, pressure: number) => void;
  end: () => void;
  transfer: (ctx: CanvasContext) => void;
}
