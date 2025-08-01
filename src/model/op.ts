import { Effect } from "@/features/effects";
import { Rect as TransformRect } from "../components/overlays/TransformRectHandles";
import { applyPatches } from "../libs/applyPatches";
import { canvasToImageDiff } from "../libs/imageDiff";
import { MCanvas } from "../libs/MCanvas";
import { Patch } from "../libs/patch";
import { startTouchBrush } from "../libs/touch/brush";
import type { State } from "./state";
import { getLayerById, StateReplaceLayerCanvas } from "./state";
import { StateDiff } from "./stateContainer";
import { createFill } from "@/libs/createFill";

export type Op = {
  type: "stroke";
  erase: boolean;
  alphaLock: boolean;
  strokeStyle: {
    color: string
    brushType: string
    width: number
  };
  opacity: number;
  path: { pos: [number, number], pressure: number }[];
  layerId: string;
} | {
  type: "fill";
  fillColor: string;
  opacity: number;
  erase: boolean;
  path: [number, number][];
  layerId: string;
} | {
  type: "bucketFill";
  fillColor: string;
  opacity: number;
  erase: boolean;
  tolerance: number;
  pos: [number, number];
  layerId: string;
} | {
  type: "layerTransform";
  layerId: string;
  rect: TransformRect;
} | {
  type: "selectionFill";
  fillColor: string;
  opacity: number;
  layerId: string;
} | {
  type: "selectionDelete";
  layerId: string;
} | {
  type: "applyEffect";
  effect: Effect;
  layerId: string;
} | {
  type: "patch";
  name: string;
  patches: Patch[];
};

export function applyOp(
  state: State,
  op: Op,
): {
  state: State;
  diff: StateDiff;
} | null {
  if (op.type === "stroke") {
    const layer = getLayerById(state.layers, op.layerId);
    if (layer.type !== "layer") return null;
    const touch =
      startTouchBrush({
        brushType: op.strokeStyle.brushType,
        width: op.strokeStyle.width,
        color: op.strokeStyle.color,
        opacity: op.opacity,
        erase: op.erase,
        alphaLock: op.alphaLock,
        canvasSize: [layer.canvas.width, layer.canvas.height],
      });
    const newCanvas = new MCanvas(
      layer.canvas.width,
      layer.canvas.height,
    );
    const ctx = newCanvas.getContextWrite();
    ctx.drawImage(layer.canvas.getCanvas(), 0, 0);

    if (op.type === "stroke") {
      for (const p of op.path) {
        touch.stroke(p.pos[0], p.pos[1], p.pressure);
      }
    }

    touch.end();
    touch.transfer(ctx);

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
    const newState = StateReplaceLayerCanvas(state, layer.id, newCanvas);
    return { state: newState, diff };
  }
  if (op.type === "fill") {
    const layer = getLayerById(state.layers, op.layerId);
    if (layer.type !== "layer") return null;
    const newCanvas = new MCanvas(
      layer.canvas.width,
      layer.canvas.height,
    );
    const ctx = newCanvas.getContextWrite();
    ctx.drawImage(layer.canvas.getCanvas(), 0, 0);
    createFill(op.path, op.fillColor, op.opacity, op.erase)(ctx);

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
    const newState = StateReplaceLayerCanvas(state, layer.id, newCanvas);
    return { state: newState, diff };
  }
  if (op.type === "bucketFill") {
    // TODO
  }
  if (op.type === "selectionFill") {
    // TODO
  }
  if (op.type === "layerTransform") {
    // TODO
  }
  if (op.type === "patch") {
    const aps = applyPatches(state, op.patches);
    return { state: aps.obj as State, diff: { type: "patch", patches: aps.revPatches } };
  }
  return null;
}

// Merge two operations into one
// Returns null if the operations cannot be merged
export function mergeOp(
  op1: Op,
  op2: Op,
): Op | null {
  if (op1.type === "patch" && op2.type === "patch" && op1.name === op2.name) {
    const patches = shrinkPatches([...op1.patches, ...op2.patches]);
    if (patches)
      return {
        type: "patch",
        name: op1.name,
        patches,
      };
  }
  return null;
}

export function shrinkPatches(patches: Patch[]): Patch[] | null {
  patches = patches.slice();
  let shrinked = false;
  iterate: do {
    for (let i = 0; i < patches.length; i++) {
      const current = patches[i];
      const next = patches[i + 1];
      if (next && current.op === "replace" && next.op === "replace" &&
        JSON.stringify(current.path) === JSON.stringify(next.path)) {
        patches.splice(i, 1);
        shrinked = true;
        continue iterate;
      }
    }
  } while (false);
  return shrinked ? patches : null;
}
