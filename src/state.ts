import { create } from 'zustand';
import { drawSoftLine } from './ccanvas';

type ToolType = "pen" | "eraser" | "fill";

export type State = {
  color: string
  penSize: number
  opacity: number
  softPen: boolean
  canvas: HTMLCanvasElement
  canvasRaster: HTMLCanvasElement
  imageData: ImageData | null
  addLine: (line: [number, number, number, number]) => void
  begin: () => void
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
  addLine(line) {
    set((state) => {
      if (!state.softPen) {
        const ctx = state.canvasRaster.getContext("2d")!;
        ctx.lineCap = "round";
        ctx.strokeStyle = state.tool === "pen" ? state.color : "#fff";
        ctx.lineWidth = state.penSize;
        ctx.beginPath();
        ctx.moveTo(line[0], line[1]);
        ctx.lineTo(line[2], line[3]);
        ctx.stroke();
      } else {
        if (state.imageData) {
          drawSoftLine(state.imageData, line[0], line[1], line[2], line[3], state.penSize);
          const ctx = state.canvasRaster.getContext("2d")!;
          ctx.putImageData(state.imageData, 0, 0);
        }
      }
      return { updatedAt: new Date() }
    })
  },
  begin() {
    set((state) => {
      const ctx = state.canvasRaster.getContext("2d")!;
      ctx.fillStyle = state.tool === "pen" ? state.color : "#fff";
      ctx.fillRect(0, 0, state.canvasRaster.width, state.canvasRaster.height);
      const imageData = ctx.getImageData(0, 0, state.canvasRaster.width, state.canvasRaster.height);
      ctx.clearRect(0, 0, state.canvasRaster.width, state.canvasRaster.height);
      // set to transparent
      for (let i = 3; i < imageData.data.length; i += 4)
        imageData.data[i] = 0;
      return { imageData, updatedAt: new Date() }
    })
  },
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
      state.canvasRaster.width = width;
      state.canvasRaster.height = height;
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
