import { produce } from "immer";
import { canvasToImageDiff } from "../libs/canvasUtil";
import { TmpCanvas } from "../libs/tmpCanvas";
import type { State, StateDiff } from "./state";

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

export function applyOp(
  state: State,
  op: Op,
): {
  state: State;
  diff: StateDiff;
} | null {
  if (op.type === "stroke" || op.type === "fill") {
    const layer = state.layers[op.layerIndex];
    const tmpCanvas = new TmpCanvas();
    const newCanvas = new OffscreenCanvas(
      layer.canvas.width,
      layer.canvas.height,
    );
    const ctx = newCanvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get context");
    }
    ctx.drawImage(layer.canvas, 0, 0);

    if (op.type === "stroke") {
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
      tmpCanvas.begin({
        size: [layer.canvas.width, layer.canvas.height],
        style: op.fillColor,
        soft: false,
      });
      tmpCanvas.fill(op.path);
    }

    ctx.globalAlpha = op.opacity;
    ctx.drawImage(tmpCanvas.canvas, 0, 0);
    tmpCanvas.finish();

    const id = canvasToImageDiff(
      newCanvas,
      layer.canvas);

    if (id == null)
      return null;
    const diff: StateDiff = {
      type: "imageDiffs",
      layers: [{
        id: layer.id,
        imageDiff: id,
      }],
    };
    const newState = produce(state, (draft) => {
      draft.layers[op.layerIndex] = {
        ...draft.layers[op.layerIndex],
        canvas: newCanvas,
      };
    });
    return { state: newState, diff };
  }
  return null;
}
