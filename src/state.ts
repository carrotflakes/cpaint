import { create } from 'zustand';

type ToolType = "pen" | "eraser" | "fill";

export type State = {
  color: string
  penSize: number
  opacity: number
  softPen: boolean
  canvas: HTMLCanvasElement
  imageData: ImageData | null
  finish: (canvas: HTMLCanvasElement) => void
  setSize: (width: number, height: number) => void
  updatedAt: Date
  setColor: (color: string) => void
  setPenSize: (size: number) => void
  setOpacity: (opacity: number) => void
  setSoftPen: (softPen: boolean) => void
  tool: ToolType
  setTool: (tool: ToolType) => void
};

export const useStore = create<State>()((set) => ({
  color: "#000",
  penSize: 5,
  opacity: 1,
  softPen: false,
  canvas: document.createElement("canvas"),
  canvasRaster: document.createElement("canvas"),
  imageData: null,
  finish(canvas) {
    set((state) => {
      const ctx = state.canvas.getContext("2d")!;
      ctx.save();
      ctx.globalAlpha = state.opacity;
      ctx.drawImage(canvas, 0, 0);
      ctx.restore();
      // state.canvasRaster.getContext('2d')!.clearRect(0, 0, state.canvasRaster.width, state.canvasRaster.height);
      return { updatedAt: new Date() }
    })
  },
  setSize(width, height) {
    set((state) => {
      state.canvas.width = width;
      state.canvas.height = height;
      return { updatedAt: new Date() }
    })
  },
  updatedAt: new Date(),
  setColor(color) {
    set({ color })
  },
  setPenSize(size) {
    set({ penSize: size })
  },
  setOpacity(opacity) {
    set({ opacity })
  },
  setSoftPen(softPen) {
    set({ softPen })
  },
  tool: "pen",
  setTool(tool) {
    set({ tool })
  }
}));
