import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TmpCanvas } from './libs/tmpCanvas';
import { History } from './libs/history';

type ToolType = "pen" | "eraser" | "fill";

export type State = {
  color: string
  penSize: number
  opacity: number
  softPen: boolean
  history: History<Op>
  canvas: HTMLCanvasElement
  apply: (op: Op, canvas: HTMLCanvasElement) => void
  setSize: (width: number, height: number) => void
  updatedAt: Date
  setColor: (color: string) => void
  setPenSize: (size: number) => void
  setOpacity: (opacity: number) => void
  setSoftPen: (softPen: boolean) => void
  tool: ToolType
  setTool: (tool: ToolType) => void
  canvasView: {
    angle: number,
    scale: number,
    pan: [number, number],
  },

  undo: () => void
  redo: () => void
};

export type Op = {
  type: "stroke";
  strokeStyle: {
    color: string
    soft: boolean
  };
  opacity: number;
  path: { pos: [number, number], size: number }[];
} | {
  type: "fill";
  fillColor: string;
  opacity: number;
  path: { pos: [number, number] }[];
};

export const useStore = create<State>()((set) => {
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 400;

  return ({
    color: "#000",
    penSize: 5,
    opacity: 1,
    softPen: false,
    history: new History<Op>(Infinity), // TODO: limit
    canvas,
    apply(op, canvas) {
      set((state) => {
        const ctx = state.canvas.getContext("2d")!;
        ctx.save();
        ctx.globalAlpha = state.opacity;
        ctx.drawImage(canvas, 0, 0);
        ctx.restore();
        const history = state.history.clone();
        history.push(op);
        return { history, updatedAt: new Date() }
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
    },
    canvasView: {
      angle: 0,
      scale: 1,
      pan: [0, 0],
    },

    undo() {
      set((state) => {
        const history = state.history.clone();
        const op = history.undo();

        if (op) {
          const ctx = state.canvas.getContext("2d")!;
          ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
          const tmpCanvas = new TmpCanvas();

          for (let i = 0; i < history.index; i++) {
            const op = history.history[i];
            applyOp(op, tmpCanvas, state, ctx);
          }

          return { history, updatedAt: new Date() }
        }
        return {}
      })
    },
    redo() {
      set((state) => {
        const history = state.history.clone();
        const op = history.redo();
        if (op) {
          const ctx = state.canvas.getContext("2d")!;
          const tmpCanvas = new TmpCanvas();
          applyOp(op, tmpCanvas, state, ctx);

          return { history, updatedAt: new Date() }
        }
        return {}
      })
    },
  })
});

function applyOp(op: Op, tmpCanvas: TmpCanvas, state: State, ctx: CanvasRenderingContext2D) {
  if (op.type === "stroke") {
    tmpCanvas.begin({
      size: [state.canvas.width, state.canvas.height],
      style: op.strokeStyle.color,
      soft: op.strokeStyle.soft,
    });
    for (let i = 0; i < op.path.length - 1; i++) {
      const p1 = op.path[i];
      const p2 = op.path[i + 1];
      tmpCanvas.addLine({
        line: [...p1.pos, ...p2.pos],
        lineWidth: p2.size,
      });
    }
  } else if (op.type === "fill") {
    tmpCanvas.begin({
      size: [state.canvas.width, state.canvas.height],
      style: op.fillColor,
      soft: false,
    });
    tmpCanvas.fill(op.path);
  }

  ctx.save();
  ctx.globalAlpha = op.opacity;
  ctx.drawImage(tmpCanvas.canvas, 0, 0);
  ctx.restore();
  tmpCanvas.finish();
}

export type GlobalSettings = {
  fingerOperations: boolean
}

export const useGlobalSettings = create<GlobalSettings>()(
  persist((_set) => ({
    fingerOperations: false
  }), {
    name: 'cpaint',
  }));
