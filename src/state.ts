import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TmpCanvas } from './libs/tmpCanvas';
import { History } from './libs/history';

type ToolType = "pen" | "eraser" | "fill";

export type State = {
  imageMeta: null | {
    id: number,
    name: string,
    createdAt: number,
  }
  color: string
  penSize: number
  opacity: number
  softPen: boolean
  history: History<Op>
  layers: {
    initial: OffscreenCanvas,
    canvas: OffscreenCanvas,
  }[],
  layerIndex: number,
  apply: (op: Op, canvas: OffscreenCanvas) => void
  // setSize: (width: number, height: number) => void
  updatedAt: Date
  tool: ToolType
  canvasView: {
    angle: number,
    scale: number,
    pan: [number, number],
  },
  clearAll: () => void

  undo: () => void
  redo: () => void
};

export type Op = {
  type: "stroke";
  erase: boolean;
  strokeStyle: {
    color: string
    soft: boolean
  };
  opacity: number;
  path: { pos: [number, number], size: number }[];
  layerIndex: number;
} | {
  type: "fill";
  fillColor: string;
  opacity: number;
  path: { pos: [number, number] }[];
  layerIndex: number;
};

export const useStore = create<State>()((set) => {
  return ({
    imageMeta: null,
    color: "#000",
    penSize: 5,
    opacity: 1,
    softPen: false,
    history: new History<Op>(Infinity), // TODO: limit
    layers: [
      {
        initial: new OffscreenCanvas(400, 400),
        canvas: new OffscreenCanvas(400, 400),
      }
    ],
    layerIndex: 0,
    apply(op, canvas) {
      set((state) => {
        const layer = state.layers[op.layerIndex];
        const ctx = layer.canvas.getContext("2d")!;
        ctx.save();
        ctx.globalAlpha = state.opacity;
        if (state.tool === "eraser")
          ctx.globalCompositeOperation = "destination-out";
        ctx.drawImage(canvas, 0, 0);
        ctx.restore();
        const history = state.history.clone();
        history.push(op);
        return { history, updatedAt: new Date() }
      })
    },
    // setSize(width, height) {
    //   set((state) => {
    //     state.canvas.width = width;
    //     state.canvas.height = height;
    //     return { updatedAt: new Date() }
    //   })
    // },
    updatedAt: new Date(),
    tool: "pen",
    canvasView: {
      angle: 0,
      scale: 1,
      pan: [0, 0],
    },
    clearAll() {
      set(() => {
        return {
          layers: [
            {
              initial: new OffscreenCanvas(400, 400),
              canvas: new OffscreenCanvas(400, 400),
            }
          ], layerIndex: 0, history: new History<Op>(Infinity), updatedAt: new Date()
        }
      })
    },

    undo() {
      set((state) => {
        const history = state.history.clone();
        const op = history.undo();

        if (op) {
          const layer = state.layers[op.layerIndex];
          const ctx = layer.canvas.getContext("2d")!;
          ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
          ctx.drawImage(layer.initial, 0, 0);
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
          const layer = state.layers[op.layerIndex];
          const ctx = layer.canvas.getContext("2d")!;
          const tmpCanvas = new TmpCanvas();
          applyOp(op, tmpCanvas, state, ctx);

          return { history, updatedAt: new Date() }
        }
        return {}
      })
    },
  })
});

function applyOp(op: Op, tmpCanvas: TmpCanvas, state: State, ctx: OffscreenCanvasRenderingContext2D) {
  ctx.save();

  if (op.type === "stroke") {
    const layer = state.layers[op.layerIndex];
    tmpCanvas.begin({
      size: [layer.canvas.width, layer.canvas.height],
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
    if (op.erase)
      ctx.globalCompositeOperation = "destination-out";
  } else if (op.type === "fill") {
    const layer = state.layers[op.layerIndex];
    tmpCanvas.begin({
      size: [layer.canvas.width, layer.canvas.height],
      style: op.fillColor,
      soft: false,
    });
    tmpCanvas.fill(op.path);
  }

  ctx.globalAlpha = op.opacity;
  ctx.drawImage(tmpCanvas.canvas, 0, 0);
  ctx.restore();
  tmpCanvas.finish();
}

export type GlobalSettings = {
  fingerOperations: boolean
  wheelZoom: boolean
}

export const useGlobalSettings = create<GlobalSettings>()(
  persist((_set) => ({
    fingerOperations: false,
    wheelZoom: false,
  }), {
    name: 'cpaint',
  }));
